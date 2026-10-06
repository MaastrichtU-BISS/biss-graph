import config from "../../sync.config.json";
import { CACHE_KEY, graphData, hasLocalPhoto } from "./graph";
import { fetchWebsiteGraph } from "./website";

/**
 * Fetches the current team and projects from biss-institute.com. When they differ from
 * what's on screen, they're cached for the next page load and `true` is returned, so the
 * caller can reload when it suits. Throws when the website can't be read.
 */
export async function syncWithWebsite(): Promise<boolean> {
  const { graph } = await fetchWebsiteGraph({
    previous: graphData,
    excludePeople: config.excludePeople,
    excludeProjects: config.excludeProjects,
    hasLocalPhoto,
  });
  if (JSON.stringify(graph) === JSON.stringify(graphData)) return false;
  localStorage.setItem(CACHE_KEY, JSON.stringify({ graph, fetchedAt: new Date().toISOString() }));
  return true;
}
