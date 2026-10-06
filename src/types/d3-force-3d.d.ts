declare module "d3-force-3d" {
  // Only what the scene uses; the library ships no types.
  export function forceCollide<N>(radius?: number | ((node: N) => number)): {
    radius(radius: number | ((node: N) => number)): ReturnType<typeof forceCollide<N>>;
    strength(strength: number): ReturnType<typeof forceCollide<N>>;
    iterations(iterations: number): ReturnType<typeof forceCollide<N>>;
  };
}
