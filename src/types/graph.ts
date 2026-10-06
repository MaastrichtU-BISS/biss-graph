export enum NodeType {
  PROJECT = "Project",
  TEAM_MEMBER = "Team Member",
  PUBLICATION = "Publication",
  EDUCATION = "Education",
}

/** A news post shown between spotlights in the idle loop. */
export type Highlight = { text: string; url: string; image?: string };

export type Graph = {
  nodes: Node[];
  links: Edge[];
  highlights?: Highlight[];
};

export type Node = {
  id: string;
  name: string;
  group: NodeType;
  color?: string;
  role?: string;
  role_nl?: string;
  name_nl?: string;
  /** Projects: "in-progress" or "finished". */
  status?: string;
  /** Projects: areas of work, from sync.config.json. */
  areas?: string[];
  /** Publications: where to read them. */
  links?: { title: string; url: string }[];
  /** Photo on the website, for people without a photo in the repo. */
  photo_url?: string;
  info_url?: string;
}

export type Edge = {
  source: string;
  target: string;
}

/** A node as shown in the UI: resolved photo, single-line label and its connections. */
export type Entity = {
  id: string;
  group: NodeType;
  /** Name as authored, may contain line breaks for the 3D label. */
  name: string;
  /** Name on one line, for panels and lists. */
  title: string;
  color: string;
  photo?: string;
  role?: string;
  roleNl?: string;
  titleNl?: string;
  status?: string;
  areas: string[];
  links: { title: string; url: string }[];
  infoUrl?: string;
  /** The public page (not the embeddable one), for QR codes. */
  pageUrl?: string;
  connections: string[];
}

export type BrowseTab = "people" | "projects" | "publications";
