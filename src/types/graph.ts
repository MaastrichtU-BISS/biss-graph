export class Graph {
  /**
   * param1 list of nodes
   * 
   * param2 list of links
   */
  constructor(nodes: Node[], links: Link[]) {
    this.graph = new Map();
    this.nodes = new Map();
    this.links = new Map();

    nodes.map((n: Node) => {
      if (!this.graph.has(n.id)) {
        this.graph.set(n.id, []);
        this.nodes.set(n.id, n);
      }
    });

    links.map((l: Link) => {
      if (this.graph.has(l.source)) {
        this.graph.get(l.source)?.push(l.target);
        this.graph.get(l.target)?.push(l.source);
      }
      this.links.set(`${l.source},${l.target}`, l);
      this.links.set(`${l.target},${l.source}`, l);
    });
  }

  private graph: Map<string, string[]>;
  private nodes: Map<string, Node>;
  private links: Map<string, Link>;

  get getGraph(): Map<string, string[]> {
    return this.graph;
  }

  get getNodes(): Node[] {
    return Array.from(this.nodes.values());
  }

  get getLinks(): Link[] {
    return Array.from(this.links.values());
  }

    /**
   * param1 list of node ids
   * 
   * return an induced subgraph
   */
  subGraph(node_ids: string[]) {
    const newNodes: Node[] = [];
    const newLinks: Link[] = [];

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

export type Node = {
  id: string;
  group: string;
  radius: number;
  citing_patents_count: number;
};

export type Link = {
  source: string;
  target: string;
  value: number;
};
