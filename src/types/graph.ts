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
  pfp_src?: string;
  info_url?: string;
}

export type Edge = {
  source: string;
  target: string;
}
