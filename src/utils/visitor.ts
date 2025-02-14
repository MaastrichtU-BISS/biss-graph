import { Graph, Node, Edge } from "../types/graph";

export abstract class Visitor {
  /**
   *A graph is an object with nodes: Node[] and links: Edge[]
   */
  constructor(
    protected graph: Graph,
    protected currentNodeId: string = "elsa"
  ) {
    this.graph = graph;

    this.visited = {};
    this.neighbours = {};

    this.graph.nodes.map((node: Node) => {
      this.neighbours[node.id] = [];
      this.visited[node.id] = false;
    });

    this.graph.links.map((e: Edge) => {
      this.neighbours[e.source].push(e.target);
      this.neighbours[e.target].push(e.source);
    });
  }

  protected visited: { [id: string]: boolean };
  protected neighbours: { [id: string]: string[] };

  getCurrentNodeId() {
    return this.currentNodeId;
  }

  reset() {
    this.graph.nodes.map((node: Node) => {
      this.visited[node.id] = false;
    });
  }

  abstract moveNext(): void;
}

export class RandomVisitor extends Visitor {
  moveNext() {
    this.visited[this.currentNodeId] = true;

    // gets the unvisited neighbours
    let options = this.neighbours[this.currentNodeId].filter(
      (id: string) => !this.visited[id]
    );

    // no more unvisited neighbours
    if (!options?.length) {
      // jump to an uvisited node that is not a neighbour
      options = Object.keys(this.visited).filter(
        (id: string) => !this.visited[id]
      );
    }

    // all the nodes have been visited
    if (!options?.length) {
      // reset
      console.log("All the nodes have been visited. (RESETTING)")
      this.reset();
      options = this.neighbours[this.currentNodeId];
    }

    const nextNodeId = options[Math.floor(Math.random() * options.length)];
    this.currentNodeId = nextNodeId;
  }
}
