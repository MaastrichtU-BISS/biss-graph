declare module "d3-force-3d" {
  // Only what the app uses; the library ships no types.
  type Accessor<N, T> = T | ((node: N) => T);

  interface Force<N> {
    (alpha: number): void;
  }

  export interface Simulation<N> {
    numDimensions(n: 1 | 2 | 3): Simulation<N>;
    force(name: string, force: Force<N> | null): Simulation<N>;
    stop(): Simulation<N>;
    tick(iterations?: number): Simulation<N>;
  }

  export function forceSimulation<N>(nodes?: N[], numDimensions?: 1 | 2 | 3): Simulation<N>;

  export function forceCollide<N>(radius?: Accessor<N, number>): Force<N> & {
    radius(radius: Accessor<N, number>): ReturnType<typeof forceCollide<N>>;
    strength(strength: number): ReturnType<typeof forceCollide<N>>;
    iterations(iterations: number): ReturnType<typeof forceCollide<N>>;
  };

  export function forceLink<N, L>(links?: L[]): Force<N> & {
    distance(distance: number): ReturnType<typeof forceLink<N, L>>;
    strength(strength: number): ReturnType<typeof forceLink<N, L>>;
  };

  export function forceManyBody<N>(): Force<N> & {
    strength(strength: number): ReturnType<typeof forceManyBody<N>>;
  };

  export function forceX<N>(x?: Accessor<N, number>): Force<N> & {
    strength(strength: number): ReturnType<typeof forceX<N>>;
  };

  export function forceY<N>(y?: Accessor<N, number>): Force<N> & {
    strength(strength: number): ReturnType<typeof forceY<N>>;
  };
}
