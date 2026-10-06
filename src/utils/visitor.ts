import { Graph, Node, Edge } from "../types/graph";

const pick = <T>(items: T[]) => items[Math.floor(Math.random() * items.length)];

export abstract class Visitor {
  /**
   *A graph is an object with nodes: Node[] and links: Edge[]
   */
  constructor(
    protected graph: Graph,
    protected currentNodeId: string = pick(graph.nodes).id
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

  /** Forget the walk so far and continue from a random node. */
  restart() {
    this.reset();
    this.currentNodeId = pick(this.graph.nodes).id;
  }

  abstract moveNext(): void;
}

export class RandomVisitor extends Visitor {
  /** Chance of jumping to a random unvisited node instead of following a link. */
  jumpChance = 0.3;

  moveNext() {
    this.visited[this.currentNodeId] = true;

    const unvisited = () => Object.keys(this.visited).filter((id: string) => !this.visited[id]);

    // gets the unvisited neighbours
    let options = this.neighbours[this.currentNodeId].filter(
      (id: string) => !this.visited[id]
    );

    // no more unvisited neighbours, or an occasional jump to keep the tour unpredictable
    if (!options.length || Math.random() < this.jumpChance) {
      options = unvisited();
    }

    // all the nodes have been visited
    if (!options.length) {
      this.reset();
      this.visited[this.currentNodeId] = true;
      options = unvisited();
    }

    this.currentNodeId = pick(options);
  }
}
