import { computed, ref, watch } from "vue";

/** Settings belong to this screen and survive reloads and the idle loop. */
export type Lang = "en" | "nl";
const LANG_KEY = "biss-graph:lang";
const SIZE_KEY = "biss-graph:large-text";
const saved = (key: string) => {
  try { return localStorage.getItem(key); } catch { return null; }
};
const persist = (key: string, value: string) => {
  try { localStorage.setItem(key, value); } catch { /* The current session still works without storage. */ }
};

export const lang = ref<Lang>(saved(LANG_KEY) === "nl" ? "nl" : "en");

/**
 * `?theme=light` or `?theme=dark` overrides the saved screen setting.
 */
export type Theme = "dark" | "light";
const THEME_KEY = "biss-graph:theme";
const requested = new URLSearchParams(location.search).get("theme");
export const theme = ref<Theme>(
  requested === "light" || requested === "dark" ? requested : saved(THEME_KEY) === "light" ? "light" : "dark"
);
watch(
  theme,
  (th) => {
    document.documentElement.classList.toggle("light", th === "light");
    persist(THEME_KEY, th);
  },
  { immediate: true }
);
export const largeText = ref(saved(SIZE_KEY) === "true");

watch(largeText, (on) => {
  document.documentElement.classList.toggle("large-text", on);
  persist(SIZE_KEY, String(on));
}, { immediate: true });
watch(lang, (l) => {
  document.documentElement.lang = l;
  persist(LANG_KEY, l);
}, { immediate: true });

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const en = {
  title: "Who works on what",
  subtitle: "BISS is like the A-team, but with professors from Maastricht University",
  allPeople: "All people",
  allProjects: "All projects",
  people: "People",
  projects: "Projects",
  publications: "Publications",
  overview: "Overview",
  hintTap: "Tap a face or project",
  hintDrag: "Drag to turn",
  hintPinch: "Pinch to zoom",
  scanToVisit: "Scan to visit",
  touchToExplore: "Touch the screen to explore",
  touchToExploreShort: "Touch to explore",
  findOut: "Find out who at BISS works on which project",
  inTheSpotlight: "In the spotlight",
  latestNews: "Latest news",
  scanToRead: "Scan to read on your phone",
  whatIsBiss: "What is BISS?",
  teamMember: "Team member",
  project: "Project",
  publication: "Publication",
  education: "Education",
  running: "Running",
  finished: "Finished",
  viewProfile: "View full profile",
  readProject: "Read about this project",
  readMore: "Read more",
  readPublication: "Read the publication",
  watchAnimation: "Watch the animation",
  watch: (title: string) => `Watch: ${title}`,
  worksOn: "Works on",
  alsoInvolved: "Publications and teaching",
  theTeam: "The team",
  authors: "Authors",
  takeItWithYou: "Take it with you",
  scanToOpen: "Scan to open this page on your phone",
  close: "Close",
  filter: "Filter",
  all: "All",
  status: "Status",
  areas: "Areas",
  show: "Show",
  largerText: "Larger text",
  lightTheme: "Light theme",
  darkTheme: "Dark theme",
  worksOnCount: (n: number) => `Works on ${plural(n, "project", "projects")}`,
  involvedIn: (n: number) => `Involved in ${plural(n, "project", "projects")} at BISS.`,
  partOfTeam: "Part of the BISS team.",
  peopleWorkOn: (n: number) => `${plural(n, "person", "people")} from BISS ${n === 1 ? "works" : "work"} on this.`,
  projectBy: (n: number) => `A project by ${plural(n, "person", "people")}`,
  byAuthors: (n: number) => `By ${plural(n, "BISS author", "BISS authors")}.`,
  projectCount: (n: number) => plural(n, "project", "projects"),
  more: (n: number) => `+${n} more`,
  area: {
    Law: "Law",
    Health: "Health",
    Mobility: "Mobility",
    "Responsible AI": "Responsible AI",
    Business: "Business",
    Finance: "Finance",
    Society: "Society",
    Industry: "Industry",
  } as Record<string, string>,
};

const nl: typeof en = {
  title: "Wie werkt waaraan",
  subtitle: "BISS is als het A-team, maar dan met professoren van de Universiteit Maastricht",
  allPeople: "Alle mensen",
  allProjects: "Alle projecten",
  people: "Mensen",
  projects: "Projecten",
  publications: "Publicaties",
  overview: "Overzicht",
  hintTap: "Tik op een gezicht of project",
  hintDrag: "Sleep om te draaien",
  hintPinch: "Knijp om te zoomen",
  scanToVisit: "Scan om te bezoeken",
  touchToExplore: "Raak het scherm aan om te ontdekken",
  touchToExploreShort: "Raak aan om te ontdekken",
  findOut: "Ontdek wie bij BISS aan welk project werkt",
  inTheSpotlight: "In de schijnwerpers",
  latestNews: "Laatste nieuws",
  scanToRead: "Scan om op je telefoon te lezen",
  whatIsBiss: "Wat is BISS?",
  teamMember: "Teamlid",
  project: "Project",
  publication: "Publicatie",
  education: "Onderwijs",
  running: "Lopend",
  finished: "Afgerond",
  viewProfile: "Bekijk het profiel",
  readProject: "Lees over dit project",
  readMore: "Lees meer",
  readPublication: "Lees de publicatie",
  watchAnimation: "Bekijk de animatie",
  watch: (title: string) => `Bekijk: ${title}`,
  worksOn: "Werkt aan",
  alsoInvolved: "Publicaties en onderwijs",
  theTeam: "Het team",
  authors: "Auteurs",
  takeItWithYou: "Neem het mee",
  scanToOpen: "Scan om deze pagina op je telefoon te openen",
  close: "Sluiten",
  filter: "Filter",
  all: "Alles",
  status: "Status",
  areas: "Gebieden",
  show: "Toon",
  largerText: "Grotere tekst",
  lightTheme: "Licht thema",
  darkTheme: "Donker thema",
  worksOnCount: (n: number) => `Werkt aan ${plural(n, "project", "projecten")}`,
  involvedIn: (n: number) => `Betrokken bij ${plural(n, "project", "projecten")} bij BISS.`,
  partOfTeam: "Onderdeel van het BISS-team.",
  peopleWorkOn: (n: number) => `${plural(n, "persoon", "mensen")} van BISS ${n === 1 ? "werkt" : "werken"} hieraan.`,
  projectBy: (n: number) => `Een project van ${plural(n, "persoon", "mensen")}`,
  byAuthors: (n: number) => `Door ${plural(n, "BISS-auteur", "BISS-auteurs")}.`,
  projectCount: (n: number) => plural(n, "project", "projecten"),
  more: (n: number) => `+${n} meer`,
  area: {
    Law: "Recht",
    Health: "Gezondheid",
    Mobility: "Mobiliteit",
    "Responsible AI": "Verantwoorde AI",
    Business: "Bedrijfsleven",
    Finance: "Financiën",
    Society: "Samenleving",
    Industry: "Industrie",
  },
};

const STRINGS = { en, nl };

/** The strings for the current language; use as `t.value.title` or `t.value.involvedIn(3)`. */
export const t = computed(() => STRINGS[lang.value]);
