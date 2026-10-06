import snapshot from "../../graph-elements.json";
import { Entity, Graph, Highlight, NodeType } from "../types/graph";
import type { Lang } from "../i18n";

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
export const CONTENT_COLOR: Partial<Record<NodeType, string>> = {
  [NodeType.PUBLICATION]: "#b9c6ff",
  [NodeType.EDUCATION]: "#f6c177",
};

export const graphData = loadGraph();

export const entities: Record<string, Entity> = {};

for (const n of graphData.nodes) {
  entities[n.id] = {
    id: n.id,
    group: n.group,
    name: n.name,
    title: n.name.replace(/\s*\n\s*/g, " ").trim(),
    color: n.color ?? CONTENT_COLOR[n.group] ?? PERSON_COLOR,
    photo: n.group === NodeType.TEAM_MEMBER ? (localPhotos.get(n.id) ?? n.photo_url) : undefined,
    role: n.role,
    roleNl: n.role_nl,
    titleNl: n.name_nl,
    status: n.status,
    areas: n.areas ?? [],
    links: n.links ?? [],
    infoUrl: n.info_url,
    pageUrl: n.info_url?.replace("/iframe/", "/"),
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

/** Publications and teaching, newest first as the website lists them. */
export const publications = Object.values(entities).filter(
  (e) => e.group === NodeType.PUBLICATION || e.group === NodeType.EDUCATION
);

export const isContent = (e: Entity) => e.group === NodeType.PUBLICATION || e.group === NodeType.EDUCATION;

export const highlights: Highlight[] = graphData.highlights ?? [];

/** Existing snapshot posts without a Dutch website excerpt still get a useful summary. */
const NEWS_NL: Record<string, string> = {
  "7505632800117682176": "BISS bestaat tien jaar. We vieren tien jaar onderzoek, innovatie en samenwerking.",
  "7505531664475942912": "Welkom bij BISS, Bas Hack! Bas begint aan het tweede jaar van de onderzoeksmaster Europese studies.",
  "7504129629612527616": "Kan VR helpen om financiële stress beter te begrijpen? BISS praat over de VR-ervaring Kiezen onder financiële druk.",
  "7465688504102993920": "Nieuw project: DAZM onderzoekt digitale autonomie in de zorg en het mkb, met steun van SIDN fonds en Digital Holland.",
  "7499019764921540608": "Op het PAS Festival in Maastricht kunnen bezoekers financiële keuzes onder druk ervaren in VR.",
  "7464980917153955841": "DigiMach vraagt maakbedrijven naar hun ervaringen met digitale vernieuwing.",
  "7467873573496340480": "BISS krijgt steun voor een nieuw project rond digitale competenties van de Nederlandse Organisatie voor Wetenschappelijk Onderzoek.",
  "7483849615465922560": "Het BISS-team zette zich samen in voor een bijzonder resultaat.",
};

export const highlightTextOf = (h: Highlight, lang: Lang) =>
  lang === "nl"
    ? h.textNl || Object.entries(NEWS_NL).find(([id]) => h.url.includes(id))?.[1] || "Nieuw bericht van BISS. Scan om het te lezen."
    : h.text;

/** Every area of work used by a project, for the filter. */
export const areas = [...new Set(projects.flatMap((p) => p.areas))].sort();

/** Editorial Dutch project titles take precedence over inconsistent website translations. */
const PROJECT_TITLES_NL: Record<string, string> = {
  better: "BETTER: verantwoorde data-analyse in de zorg",
  "audio-to-semantics": "Hoe herkennen we geluid dat we niet kunnen zien?",
  "fair-ai": "FAIR4AI: AI-modellen bruikbaar maken in de praktijk",
  techalliance: "Klantenservice verbeteren met AI",
  "nijsen-project": "De samenstelling van diervoeder bepalen met data",
  "netspar-financial-advice": "Kunnen geautomatiseerde systemen goed financieel advies geven?",
  benedrone: "BeNeDrone: grensoverschrijdende inzet van medische drones",
  lawnotation: "Software voor juridisch onderzoek",
  digimach: "DigiMach: slimme, duurzame en verbonden maakindustrie",
  "sittard-geleen": "Op weg naar een duidelijke en eenvoudige bijstandsaanvraag",
  "choosing-under-financial-pressure-a-vr-experience": "Kiezen onder financiële druk: een VR-ervaring",
  "flying-forward": "Flying Forward: drones die zelfstandig vliegen",
  "factory-shutdown": "Fabrieksstilstand voorkomen met datawetenschap",
  "priceless-assets": "Priceless Assets of Subversion: financiële criminaliteit en de waarde van unieke goederen",
};
const ROLES_NL: Record<string, string> = {
  "judith-kamalski": "Algemeen directeur | Wetenschappelijk directeur",
  "aleksandra-draper": "Junior projectleider | Officemanager",
  "andre-dekker": "Projectleider Smart Health | Hoofdonderzoeker",
  "chris-van-der-lans": "Frontendontwikkelaar",
  "shashank-subramanya": "Onderzoeksingenieur",
  "carlos-aguilera": "Data-engineer",
  "shashank-chakravarthy": "Onderzoeksingenieur | Promovendus",
  "vivienne-curvers": "Senior projectmanager",
  "david-wicker": "Fullstackontwikkelaar",
};

/** Title and role in the visitor's language, falling back to the original title. */
export const titleOf = (e: Entity, lang: Lang) =>
  (lang === "nl" && (PROJECT_TITLES_NL[e.id] || e.titleNl)) || e.title;
export const roleOf = (e: Entity, lang: Lang) =>
  (lang === "nl" && (ROLES_NL[e.id] || e.roleNl)) || e.role;

export const websiteUrlOf = (url: string, lang: Lang) =>
  lang === "nl" ? url.replace(/(biss-institute\.com\/)en\//, "$1nl/") : url;

/** In a person's panel: their projects, and separately their publications and teaching. */
export const projectsOf = (e: Entity) => e.connections.map((id) => entities[id]).filter((c) => c.group === NodeType.PROJECT);
export const contentOf = (e: Entity) => e.connections.map((id) => entities[id]).filter(isContent);
