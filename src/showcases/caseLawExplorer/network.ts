import { forceLink, forceManyBody, forceSimulation, forceX, forceY } from "d3-force-3d";

/**
 * A synthetic citation network that behaves like real case law: decisions cite earlier
 * ones, mostly within their own area of law, and well-cited decisions attract more
 * citations (so landmark cases emerge). It only illustrates; it is not real data.
 */

export type Court = "NL" | "CJEU" | "ECHR";

export const COURTS: { id: Court; label: string; color: string; share: number }[] = [
  { id: "NL", label: "Dutch courts", color: "#ff9f43", share: 0.7 },
  { id: "CJEU", label: "Court of Justice of the EU", color: "#ffd43b", share: 0.18 },
  { id: "ECHR", label: "European Court of Human Rights", color: "#4dd4c6", share: 0.12 },
];

export const TOPICS = ["liability", "privacy", "employment", "tax", "migration"];
export const SEARCH_TOPIC = 1; // privacy

export const FIRST_YEAR = 1990;
export const LAST_YEAR = 2025;

export type Decision = {
  index: number;
  ecli: string;
  court: Court;
  year: number;
  topic: number;
  cites: number[];
  citedBy: number;
  /** Position in the citation network, roughly within -1..1. */
  net: { x: number; y: number };
  /** Position on the timeline (x by year, y by area of law), within -1..1. */
  time: { x: number; y: number };
};

export type Network = {
  decisions: Decision[];
  links: { from: number; to: number }[];
  /** A recent decision with plenty of citations, used to introduce the idea. */
  seed: number;
  /** The most-cited decisions. */
  hubs: number[];
  /** A chain of precedents within the searched topic, newest first. */
  path: number[];
};

/** Small deterministic PRNG, so the animation looks the same every time. */
const mulberry32 = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const NL_COURTS = ["HR", "RBAMS", "RBDHA", "GHAMS", "CRVB", "RVS", "RBROT", "GHSHE"];

export function buildNetwork(count = 420, seed = 7): Network {
  const random = mulberry32(seed);
  const pick = <T>(items: T[]) => items[Math.floor(random() * items.length)];

  const court = (): Court => {
    let r = random();
    for (const c of COURTS) if ((r -= c.share) < 0) return c.id;
    return "NL";
  };
  // more decisions in recent years
  const year = () => Math.round(FIRST_YEAR + (LAST_YEAR - FIRST_YEAR) * Math.pow(random(), 0.6));
  const ordinal = () => 100 + Math.floor(random() * 8900);
  const ecli = (c: Court, y: number) =>
    c === "NL"
      ? `ECLI:NL:${pick(NL_COURTS)}:${y}:${ordinal()}`
      : c === "CJEU"
        ? `ECLI:EU:C:${y}:${ordinal() % 999}`
        : `ECLI:CE:ECHR:${y}:${String(1 + Math.floor(random() * 12)).padStart(2, "0")}${String(1 + Math.floor(random() * 28)).padStart(2, "0")}JUD00${ordinal()}${String(y % 100).padStart(2, "0")}`;

  const decisions: Decision[] = Array.from({ length: count }, () => {
    const c = court();
    const y = year();
    return {
      index: 0,
      ecli: ecli(c, y),
      court: c,
      year: y,
      topic: Math.floor(random() * TOPICS.length),
      cites: [],
      citedBy: 0,
      net: { x: 0, y: 0 },
      time: { x: 0, y: 0 },
    };
  }).sort((a, b) => a.year - b.year);
  decisions.forEach((d, i) => (d.index = i));

  // citations to earlier decisions, preferring the same topic, well-cited and recent ones
  const links: { from: number; to: number }[] = [];
  for (const d of decisions) {
    const earlier = decisions.filter((e) => e.year < d.year);
    if (!earlier.length) continue;
    const wanted = Math.min(earlier.length, 1 + Math.floor(random() * random() * 6));
    for (let k = 0; k < wanted; k++) {
      const sameTopic = random() < 0.88;
      const pool = earlier.filter((e) => (e.topic === d.topic) === sameTopic && !d.cites.includes(e.index));
      if (!pool.length) continue;
      const weights = pool.map((e) => Math.pow(e.citedBy + 1, 1.2) * (0.3 + Math.exp(-(d.year - e.year) / 6)));
      let r = random() * weights.reduce((a, b) => a + b, 0);
      const target = pool.find((_, i) => (r -= weights[i]) < 0) ?? pool[pool.length - 1];
      d.cites.push(target.index);
      target.citedBy++;
      links.push({ from: d.index, to: target.index });
    }
  }

  layoutNetwork(decisions, links);
  layoutTimeline(decisions, random);

  const hubs = [...decisions].sort((a, b) => b.citedBy - a.citedBy).slice(0, 3).map((d) => d.index);
  const seedDecision = [...decisions]
    .filter((d) => d.year >= LAST_YEAR - 6)
    .sort((a, b) => b.cites.length - a.cites.length)[0];

  return { decisions, links, seed: seedDecision.index, hubs, path: precedentPath(decisions) };
}

/** Topics pull towards their own corner, so areas of law form visible clusters. */
function layoutNetwork(decisions: Decision[], links: { from: number; to: number }[]) {
  type SimNode = { x: number; y: number; topic: number };
  const anchors = TOPICS.map((_, i) => {
    const a = (i / TOPICS.length) * Math.PI * 2 - Math.PI / 2;
    return { x: Math.cos(a) * 220, y: Math.sin(a) * 160 };
  });
  const nodes: SimNode[] = decisions.map((d, i) => ({
    x: anchors[d.topic].x + Math.cos(i) * 40,
    y: anchors[d.topic].y + Math.sin(i * 1.7) * 40,
    topic: d.topic,
  }));
  forceSimulation(nodes, 2)
    .force("link", forceLink(links.map((l) => ({ source: l.from, target: l.to }))).distance(24).strength(0.25))
    .force("charge", forceManyBody<SimNode>().strength(-22))
    .force("x", forceX<SimNode>((n) => anchors[n.topic].x).strength(0.12))
    .force("y", forceY<SimNode>((n) => anchors[n.topic].y).strength(0.12))
    .stop()
    .tick(320);

  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const half = Math.max(Math.max(...xs) - cx, Math.max(...ys) - cy);
  decisions.forEach((d, i) => (d.net = { x: (nodes[i].x - cx) / half, y: (nodes[i].y - cy) / half }));
}

function layoutTimeline(decisions: Decision[], random: () => number) {
  const band = 2 / TOPICS.length;
  for (const d of decisions) {
    const jitter = (random() - 0.5) * 0.9;
    d.time = {
      x: ((d.year - FIRST_YEAR + random() - 0.5) / (LAST_YEAR - FIRST_YEAR)) * 2 - 1,
      y: -1 + band * (d.topic + 0.5) + jitter * band,
    };
  }
}

/**
 * The longest chain of citations within the searched topic that ends in a recent decision,
 * newest first. Citations always point to earlier years, so this is a longest path in a DAG.
 */
function precedentPath(decisions: Decision[]) {
  const length = new Map<number, number>();
  const next = new Map<number, number>();
  for (const d of decisions) {
    if (d.topic !== SEARCH_TOPIC) continue;
    let best = 1;
    for (const c of d.cites) {
      const cited = decisions[c];
      if (cited.topic !== SEARCH_TOPIC) continue;
      const l = (length.get(c) ?? 1) + 1;
      if (l > best || (l === best && cited.citedBy > decisions[next.get(d.index) ?? c].citedBy)) {
        best = l;
        next.set(d.index, c);
      }
    }
    length.set(d.index, best);
  }
  const start = decisions
    .filter((d) => d.topic === SEARCH_TOPIC && d.year >= LAST_YEAR - 3)
    .sort((a, b) => (length.get(b.index) ?? 0) - (length.get(a.index) ?? 0))[0];
  const path = [start.index];
  while (next.has(path[path.length - 1]) && path.length < 8) path.push(next.get(path[path.length - 1])!);
  return path;
}
