import { defineAsyncComponent, type Component } from "vue";

/**
 * Full-screen animations about a project, played in the idle loop when that project is in
 * the spotlight, or from the project's panel. A showcase component gets the project team
 * as `members` and emits `done` when it has finished.
 */
export type Showcase = {
  id: string;
  /** Slug of the project's page on biss-institute.com. */
  project: string;
  title: string;
  /** Length in seconds, for the progress bar. */
  duration: number;
  component: Component;
};

// Looked up by path, so a showcase whose file doesn't exist yet is simply left out.
const files = import.meta.glob<Component>("./*/*.vue", { import: "default" });

const ENTRIES = [
  { id: "case-law-explorer", project: "legal-research-software", title: "Case Law Explorer", file: "./caseLawExplorer/CaseLawExplorer.vue" },
  { id: "lawnotation", project: "legal-research-software", title: "Lawnotation", file: "./lawnotation/Lawnotation.vue" },
  { id: "digimach", project: "digimach-smart-sustainable-and-connected-manufacturing", title: "DigiMach", file: "./digimach/DigiMach.vue" },
  { id: "benedrone", project: "benedrone-cross-border-innovation-in-medical-drone-deployment", title: "BeNeDrone", file: "./benedrone/BeNeDrone.vue" },
  { id: "fair4ai", project: "fair4ai-making-ai-models-practically-usable", title: "FAIR4AI", file: "./fair4ai/Fair4ai.vue" },
  { id: "better", project: "better-responsible-data-analytics-in-healthcare", title: "BETTER", file: "./better/Better.vue" },
  // about BISS itself, not one project; plays now and then in the idle loop and from the dock
  { id: "biss", project: "", title: "What is BISS?", file: "./biss/AboutBiss.vue", duration: 66.5 },
  { id: "flying-forward", project: "flying-forward", title: "Flying Forward", file: "./flyingForward/FlyingForward.vue" },
];

export const showcases: Showcase[] = (ENTRIES as ((typeof ENTRIES)[number] & { duration?: number })[])
  .filter((e) => files[e.file])
  .map(({ file, ...e }) => ({
  ...e,
  duration: e.duration ?? 40,
  component: defineAsyncComponent(files[file]),
}));

const slugOf = (url: string) => url.replace(/\/+$/, "").split("/").pop();

export const showcasesForProject = (infoUrl?: string) =>
  infoUrl ? showcases.filter((s) => s.project && s.project === slugOf(infoUrl)) : [];

export const showcaseById = (id: string | null) => showcases.find((s) => s.id === id);

/** The general "What is BISS?" showcase, once it exists. */
export const aboutShowcase = () => showcaseById("biss");

/** Downloads every showcase's code ahead of time. */
export const preloadShowcases = () => {
  for (const e of ENTRIES) void files[e.file]?.();
};
