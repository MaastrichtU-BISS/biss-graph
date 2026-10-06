/**
 * Reads the team and projects from biss-institute.com and turns them into the graph format.
 *
 *   - the team (names with titles, roles) comes from /en/about
 *   - projects and who works on them come from the post cards embedded in /en/
 *   - profile photos come from each /en/team/<slug> page, fetched only for people without
 *     a local photo
 *
 * Plain JavaScript without Node or DOM APIs, so both the app (in the browser) and
 * scripts/sync-website.mjs (in Node) can use it. The website allows cross-origin requests.
 */

export const SITE = "https://www.biss-institute.com";

/** Refuse a result this empty: the site's markup probably changed. */
const MIN_PEOPLE = 5;
const MIN_PROJECTS = 3;

const decodeEntities = (s) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&");

const clean = (s) => decodeEntities(s).replace(/\s+/g, " ").trim();

/** Astro serialises island props as [type, value] pairs; 1 marks an array. */
const decodeProps = (v) => {
  if (Array.isArray(v) && v.length === 2 && typeof v[0] === "number") {
    return v[0] === 1 ? v[1].map(decodeProps) : decodeProps(v[1]);
  }
  if (v && typeof v === "object") {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, decodeProps(x)]));
  }
  return v;
};

export const slugOf = (url) => url.replace(/\/+$/, "").split("/").pop();

const fetchText = async (path) => {
  const res = await fetch(SITE + path);
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.text();
};

/** All objects in the island props that look like post cards. */
const parseCards = (html) => {
  const cards = new Map();
  const walk = (o) => {
    if (Array.isArray(o)) return o.forEach(walk);
    if (!o || typeof o !== "object") return;
    if (typeof o.url === "string" && Array.isArray(o.tags)) cards.set(o.url, o);
    Object.values(o).forEach(walk);
  };
  for (const [, props] of html.matchAll(/<astro-island[^>]*\sprops="([^"]*)"/g)) {
    walk(decodeProps(JSON.parse(decodeEntities(props))));
  }
  return [...cards.values()];
};

const parseTeam = (html) => {
  const people = new Map();
  const card = /<a href="\/en\/team\/([a-z0-9-]+)"[^>]*data-test="team-member-card">([\s\S]*?)<\/a>/g;
  for (const [, slug, body] of html.matchAll(card)) {
    if (people.has(slug)) continue;
    const name = body.match(/<div class="font-bold">([\s\S]*?)<\/div>/)?.[1];
    const role = body.match(/<div class="opacity-80 text-sm">([\s\S]*?)<\/div>/)?.[1];
    const photo = body.match(/<img src="([^"]+)"/)?.[1];
    if (name) people.set(slug, { slug, name: clean(name), role: role ? clean(role) : undefined, photo });
  }
  return [...people.values()];
};

/** Absolute URL of the round profile photo on a team page, else the about-page card photo. */
export const profilePhoto = async (person) => {
  let src = person.photo;
  try {
    const html = await fetchText(`/en/team/${person.slug}`);
    const img = [...html.matchAll(/<img[^>]*>/g)].map((m) => m[0]).find((t) => t.includes("rounded-full"));
    src = img?.match(/src="([^"]+)"/)?.[1] ?? src;
  } catch {
    // keep the about-page photo
  }
  return src ? new URL(decodeEntities(src), SITE).href : undefined;
};

/** Stable, well-spread colour for a project that has none yet. */
const colorFor = (slug, taken) => {
  let hash = 0;
  for (const ch of slug) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  for (let i = 0; i < 360; i += 23) {
    const color = hslToHex((hash + i * 137.508) % 360, 70, 58);
    if (!taken.has(color)) return color;
  }
  return hslToHex(hash % 360, 70, 58);
};

const hslToHex = (h, s, l) => {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return "#" + [f(0), f(8), f(4)].map((x) => Math.round(x * 255).toString(16).padStart(2, "0")).join("");
};

const mapLimit = async (items, limit, fn) => {
  const results = [];
  let next = 0;
  const workers = Array.from({ length: limit }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
};

/**
 * Build the graph from the website.
 *
 * `previous` keeps ids and colours of nodes already on screen stable. People for whom
 * `hasLocalPhoto(slug)` is false get a `photo_url` pointing at the website, unless
 * `photoUrls` is false.
 */
export async function fetchWebsiteGraph({
  previous = { nodes: [], links: [] },
  excludePeople = [],
  excludeProjects = [],
  hasLocalPhoto = () => false,
  photoUrls = true,
} = {}) {
  const [home, about] = await Promise.all([fetchText("/en/"), fetchText("/en/about")]);

  const excludedPeople = new Set(excludePeople);
  const excludedProjects = new Set(excludeProjects);
  const team = parseTeam(about).filter((p) => !excludedPeople.has(p.slug));
  const onTeam = new Set(team.map((p) => p.slug));

  const projects = parseCards(home)
    .filter((c) => c.tags.includes("project") && c.url.startsWith("/en/posts/") && c.published !== false)
    .map((c) => ({
      slug: slugOf(c.url),
      title: clean(c.title),
      members: [
        ...new Set((c.team ?? []).map((t) => slugOf(t.teamMember?.id ?? "")).filter((s) => onTeam.has(s))),
      ],
    }))
    .filter((p) => !excludedProjects.has(p.slug) && p.members.length > 0);

  const working = new Set(projects.flatMap((p) => p.members));
  const people = team.filter((p) => working.has(p.slug));

  if (people.length < MIN_PEOPLE || projects.length < MIN_PROJECTS) {
    throw new Error(`website returned only ${people.length} people and ${projects.length} projects`);
  }

  // keep ids and colours of nodes that were already on the screen, matched by page url
  const previousBySlug = new Map(previous.nodes.filter((n) => n.info_url).map((n) => [slugOf(n.info_url), n]));
  const taken = new Set(previous.nodes.map((n) => n.color).filter(Boolean));
  const projectId = (slug) => previousBySlug.get(slug)?.id ?? slug;

  const photos = new Map();
  if (photoUrls) {
    const missing = people.filter((p) => !hasLocalPhoto(p.slug));
    const urls = await mapLimit(missing, 6, profilePhoto);
    missing.forEach((p, i) => urls[i] && photos.set(p.slug, urls[i]));
  }

  const graph = {
    nodes: [
      ...people.map((p) => ({
        id: p.slug,
        group: "Team Member",
        name: p.name,
        ...(p.role ? { role: p.role } : {}),
        ...(photos.has(p.slug) ? { photo_url: photos.get(p.slug) } : {}),
        info_url: `${SITE}/en/team/iframe/${p.slug}`,
      })),
      ...projects.map((p) => {
        const color = previousBySlug.get(p.slug)?.color ?? colorFor(p.slug, taken);
        taken.add(color);
        return {
          id: projectId(p.slug),
          group: "Project",
          name: p.title,
          info_url: `${SITE}/en/posts/iframe/${p.slug}`,
          color,
        };
      }),
    ],
    links: projects.flatMap((p) => p.members.map((m) => ({ source: m, target: projectId(p.slug) }))),
  };

  return {
    graph,
    team,
    /** People on the about page who aren't linked to any project. */
    skipped: team.filter((p) => !working.has(p.slug)),
  };
}
