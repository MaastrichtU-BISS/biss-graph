export enum NodeType {
  PROJECT = "Project",
  TEAM_MEMBER = "Team Member"
}

export type Graph = {
  nodes: Node[];
  links: Edge[];
};

export type Node = {
  id: string;
  name: string;
  group: NodeType;
  color?: string;
  role?: string;
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
  infoUrl?: string;
  connections: string[];
}

export type BrowseTab = "people" | "projects";
