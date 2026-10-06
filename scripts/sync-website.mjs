/**
 * Refreshes the committed snapshot (graph-elements.json and team photos) from
 * biss-institute.com. The app also syncs on its own in the browser; this snapshot is what
 * it shows before that first sync, or when the website can't be reached.
 *
 * Existing photos are kept unless --refresh-photos is passed, so hand-cropped ones survive.
 *
 * Usage: node scripts/sync-website.mjs [--dry-run] [--refresh-photos]
 * Exclusions (e.g. someone who shouldn't be on the screen yet) live in sync.config.json.
 */
import { existsSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchWebsiteGraph, profilePhoto } from "../src/data/website.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const GRAPH_FILE = join(ROOT, "graph-elements.json");
const CONFIG_FILE = join(ROOT, "sync.config.json");
const PHOTO_DIR = join(ROOT, "src/assets/images/team");
const PHOTO_EXT = /\.(jpe?g|png|webp)$/i;

const readJson = (file, fallback) => (existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : fallback);

const localPhotos = () =>
  Object.fromEntries(
    readdirSync(PHOTO_DIR)
      .filter((f) => PHOTO_EXT.test(f))
      .map((f) => [f.replace(PHOTO_EXT, ""), f])
  );

const downloadPhoto = async (slug, url, existing) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`photo for ${slug}: HTTP ${res.status}`);
  const ext = new URL(url).pathname.match(PHOTO_EXT)?.[1]?.toLowerCase() ?? "webp";
  if (existing) unlinkSync(join(PHOTO_DIR, existing));
  writeFileSync(join(PHOTO_DIR, `${slug}.${ext}`), Buffer.from(await res.arrayBuffer()));
};

const dryRun = process.argv.includes("--dry-run");
const refreshPhotos = process.argv.includes("--refresh-photos");

try {
  const config = readJson(CONFIG_FILE, {});
  const previous = readJson(GRAPH_FILE, { nodes: [], links: [] });
  const { graph, team, skipped } = await fetchWebsiteGraph({
    previous,
    excludePeople: config.excludePeople,
    excludeProjects: config.excludeProjects,
    // the snapshot keeps photos in the repo instead of linking to the website
    photoUrls: false,
  });

  const photos = localPhotos();
  const people = graph.nodes.filter((n) => n.group === "Team Member");
  const needPhotos = people.filter((p) => refreshPhotos || !photos[p.id]);
  if (!dryRun) {
    for (const p of needPhotos) {
      const url = await profilePhoto(team.find((t) => t.slug === p.id));
      if (url) await downloadPhoto(p.id, url, photos[p.id]).catch((e) => console.warn(`  ! ${e.message}`));
      else console.warn(`  ! no photo found for ${p.name}`);
    }
  }

  const json = JSON.stringify(graph, null, 2) + "\n";
  const changed = !existsSync(GRAPH_FILE) || readFileSync(GRAPH_FILE, "utf8") !== json;
  if (changed && !dryRun) writeFileSync(GRAPH_FILE, json);

  // report what changed, by name
  const names = (nodes) => new Map(nodes.map((n) => [n.id, n.name.replace(/\s*\n\s*/g, " ")]));
  const before = names(previous.nodes);
  const after = names(graph.nodes);
  const added = [...after].filter(([id]) => !before.has(id)).map(([, n]) => n);
  const removed = [...before].filter(([id]) => !after.has(id)).map(([, n]) => n);
  const renamed = [...after]
    .filter(([id, n]) => before.has(id) && before.get(id) !== n)
    .map(([id, n]) => `${before.get(id)} → ${n}`);

  const projects = graph.nodes.length - people.length;
  console.log(`${dryRun ? "[dry run] " : ""}${people.length} people, ${projects} projects, ${graph.links.length} links`);
  if (added.length) console.log(`  added:   ${added.join(", ")}`);
  if (removed.length) console.log(`  removed: ${removed.join(", ")}`);
  if (renamed.length) console.log(`  renamed: ${renamed.join("; ")}`);
  if (skipped.length) console.log(`  not shown (no projects on the website): ${skipped.map((p) => p.name).join(", ")}`);
  if (needPhotos.length) {
    console.log(`  ${dryRun ? "would download" : "downloaded"} photos: ${needPhotos.map((p) => p.name).join(", ")}`);
  }
  console.log(changed ? (dryRun ? "graph would change" : "graph-elements.json updated") : "already up to date");
} catch (e) {
  console.error(`sync failed: ${e.message}`);
  process.exit(1);
}
