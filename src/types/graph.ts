export enum NodeType {
  PROJECT = "Project",
  TEAM_MEMBER = "Team Member"
}

export type Cytoscape = {
  elements: Graph;
  style: any[];
  layout: any;
}

export type Graph = { 
    nodes: Node[];
    edges: Edge[];
};

export type Node = {
  id: string;
  name: string;
  group: NodeType;
  pfp_src?: string;
}

export type Edge = {
  source: string;
  target: string;
}
