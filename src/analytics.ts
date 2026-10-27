import { KIOSK } from "./screenMode";

/**
 * Usage events for Umami at analytics.biss-institute.com. Nothing is sent unless the build
 * has a website ID (`VITE_UMAMI_WEBSITE_ID`) and the page is served from one of `DOMAINS`, so
 * local runs, previews and the production image run on localhost stay out of the numbers. Every event is tagged `kiosk` or `web`, so the big screen can be told apart from
 * people opening the site on their own device.
 */
const WEBSITE_ID = import.meta.env.VITE_UMAMI_WEBSITE_ID as string | undefined;
const HOST = (import.meta.env.VITE_UMAMI_HOST as string | undefined) ?? "https://analytics.biss-institute.com";
/** Hostnames whose visits count, comma-separated; Umami's script ignores every other host too. */
const DOMAINS = (import.meta.env.VITE_UMAMI_DOMAINS as string | undefined) ?? "graph.biss-institute.com";
const ENABLED = !!WEBSITE_ID && DOMAINS.split(",").some((d) => d.trim() === location.hostname);

type EventData = Record<string, string | number | boolean>;
type Umami = { track: (event: string, data?: EventData) => Promise<unknown> };
declare global {
  interface Window {
    umami?: Umami;
  }
}

/** Events from before the tracker has loaded; sent once it's there. */
const queue: [string, EventData?][] = [];

export function track(event: string, data?: EventData) {
  if (!ENABLED) return;
  if (window.umami) void window.umami.track(event, data).catch(() => undefined);
  else if (queue.length < 50) queue.push([event, data]);
}

export function startAnalytics() {
  if (!ENABLED || !WEBSITE_ID) return;
  const script = document.createElement("script");
  script.defer = true;
  script.src = `${HOST}/script.js`;
  script.dataset.websiteId = WEBSITE_ID;
  script.dataset.domains = DOMAINS;
  script.dataset.tag = KIOSK ? "kiosk" : "web";
  script.onload = () => queue.splice(0).forEach(([event, data]) => track(event, data));
  document.head.append(script);
  reportStart();
}

//#region Restarts

/**
 * Why the page last reloaded on its own, kept across the reload so the next start can
 * report it. A start without one is the browser opening the page, or someone reloading by
 * hand, which on the big screen usually means it had crashed or frozen.
 */
const RESTART_KEY = "biss-graph:restart";
const STARTED_KEY = "biss-graph:started";
const startedAt = Date.now();

export type RestartReason = "stalled" | "gpu-lost" | "fresh-start" | "new-data";

/** Call right before reloading the page. */
export function noteRestart(reason: RestartReason) {
  try {
    sessionStorage.setItem(RESTART_KEY, reason);
  } catch {
    // storage unavailable; the next start just reports a manual reload
  }
}

const minutesSince = (t: number) => Math.round((Date.now() - t) / 60_000);

function reportStart() {
  let reason: string | null = null;
  let previousStart: string | null = null;
  try {
    reason = sessionStorage.getItem(RESTART_KEY);
    previousStart = sessionStorage.getItem(STARTED_KEY);
    sessionStorage.removeItem(RESTART_KEY);
    sessionStorage.setItem(STARTED_KEY, String(startedAt));
  } catch {
    // no storage: report it as a plain start
  }
  const after = reason ?? (previousStart ? "manual-reload" : "browser-start");
  const data: EventData = { after };
  if (previousStart) data.previousUptimeMinutes = minutesSince(Number(previousStart));
  track("screen-start", data);

  // a steady pulse from the big screen; a gap in it shows when and how long it was down
  if (KIOSK) window.setInterval(() => track("heartbeat", { uptimeMinutes: minutesSince(startedAt) }), 30 * 60_000);
}

//#endregion
