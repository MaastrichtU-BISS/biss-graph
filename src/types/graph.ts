export class Graph {
  /**
   * param1 list of nodes
   * 
   * param2 list of links
   */
  constructor(nodes: GraphNode[], links: GraphLink[]) {
    this.graph = new Map();
    this.nodes = new Map();
    this.links = new Map();

    nodes.map((n: GraphNode) => {
      if (!this.graph.has(n.id)) {
        this.graph.set(n.id, []);
        this.nodes.set(n.id, n);
      }
    });

    links.map((l: GraphLink) => {
      if (this.graph.has(l.source)) {
        this.graph.get(l.source)?.push(l.target);
        this.graph.get(l.target)?.push(l.source);
      }
      this.links.set(`${l.source},${l.target}`, l);
      this.links.set(`${l.target},${l.source}`, l);
    });
  }

  private graph: Map<string, string[]>;
  private nodes: Map<string, GraphNode>;
  private links: Map<string, GraphLink>;

  get getGraph(): Map<string, string[]> {
    return this.graph;
  }

  get getNodes(): GraphNode[] {
    return Array.from(this.nodes.values());
  }

  get getLinks(): GraphLink[] {
    return Array.from(this.links.values());
  }

    /**
   * param1 list of node ids
   * 
   * return an induced subgraph
   */
  subGraph(node_ids: string[]) {
    const newNodes: GraphNode[] = [];
    const newLinks: GraphLink[] = [];

    node_ids.map((node_id: string) => {
      const node = this.nodes.get(node_id);
      if (node) {
        newNodes.push(node);
        this.graph.get(node_id)?.map((n_id: string) => {
          const neighbour_node = this.nodes.get(n_id);
          if (neighbour_node) {
            newNodes.push(neighbour_node);
            const neighbour_link = this.links.get(`${node_id},${neighbour_node.id}`);
            if (neighbour_link) {
              newLinks.push(neighbour_link);
            }
          }
        });
      }
    });

    return new Graph(newNodes, newLinks);
  }
}

export type GraphNode = {
  id: string;
  group: "project" | "team_member";
  radius: number;
  citing_patents_count: number;
};

export type GraphLink = {
  source: string;
  target: string;
  value: number;
};
