import snapshot from "../../graph-elements.json";
import { Entity, Graph, NodeType } from "../types/graph";

/** Where the last graph fetched from the website is kept between page loads. */
export const CACHE_KEY = "biss-graph:website";

/** The last successful website sync if there is one, else the snapshot shipped with the app. */
const loadGraph = (): Graph => {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? "null");
    if (Array.isArray(cached?.graph?.nodes) && Array.isArray(cached?.graph?.links)) return cached.graph;
  } catch {
    // unreadable cache: fall back to the snapshot
  }
  return snapshot as Graph;
};

// Bundle every team photo so they resolve in both `vite` and `vite build`.
// Synced photos arrive as .webp, hand-picked ones are usually .jpg.
const photos = import.meta.glob<string>("../assets/images/team/*.{jpg,jpeg,png,webp}", {
  eager: true,
  query: "?url",
  import: "default",
});

const localPhotos = new Map(Object.entries(photos).map(([path, url]) => [path.replace(/^.*\/|\.\w+$/g, ""), url]));

export const hasLocalPhoto = (id: string) => localPhotos.has(id);

export const PERSON_COLOR = "#dfe6ff";

export const graphData = loadGraph();

export const entities: Record<string, Entity> = {};

for (const n of graphData.nodes) {
  entities[n.id] = {
    id: n.id,
    group: n.group,
    name: n.name,
    title: n.name.replace(/\s*\n\s*/g, " ").trim(),
    color: n.color ?? PERSON_COLOR,
    photo: n.group === NodeType.TEAM_MEMBER ? (localPhotos.get(n.id) ?? n.photo_url) : undefined,
    role: n.role,
    infoUrl: n.info_url,
    connections: [],
  };
}

for (const l of graphData.links) {
  entities[l.source]?.connections.push(l.target);
  entities[l.target]?.connections.push(l.source);
}

const byTitle = (a: Entity, b: Entity) => a.title.localeCompare(b.title);

/** Surname-ish sort key, ignoring academic titles. */
const sortName = (e: Entity) => e.title.replace(/^((dr|prof|mr|ms|ir)\.?\s+)+/i, "");

export const people = Object.values(entities)
  .filter((e) => e.group === NodeType.TEAM_MEMBER)
  .sort((a, b) => sortName(a).localeCompare(sortName(b)));

export const projects = Object.values(entities)
  .filter((e) => e.group === NodeType.PROJECT)
  .sort(byTitle);
