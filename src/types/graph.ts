export enum NodeType {
  PROJECT = "Project",
  TEAM_MEMBER = "Team Member"
}

export type Cytoscape = {
  elements: { 
      nodes: any[];
      edges: any[];
  };
  style: any[];
  layout: any;
}
