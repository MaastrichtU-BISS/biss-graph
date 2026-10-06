import { onBeforeUnmount, onMounted, type Ref } from "vue";
import { paper, paperInk, paperMuted } from "./paper";
import { canvasText } from "../translations";

/** Shared drawing and timing helpers for the project showcases. */

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
/** 0 before `a`, 1 after `b`, linear in between. */
export const progress = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
export const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
export const lerp = (a: number, b: number, x: number) => a + (b - a) * x;
/** Fades in over [a, a+fade] and out over [b-fade, b]. */
export const window01 = (t: number, a: number, b: number, fade = 0.5) =>
  progress(t, a, a + fade) * (1 - progress(t, b - fade, b));

export const FONT = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
export const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';

export type Point = { x: number; y: number };

export type Frame = {
  ctx: CanvasRenderingContext2D;
  /** Seconds since the showcase started. */
  t: number;
  W: number;
  H: number;
  /** Scale relative to a 1920×1080 screen; multiply sizes by this. */
  k: number;
  /** Vertical band free of the title bar and caption; keep content inside it. */
  safe: { top: number; bottom: number };
};

/** Small deterministic PRNG, so every run looks the same. */
export const mulberry32 = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/**
 * Runs `frame` on every animation frame against a cleared, DPR-aware canvas until `end`
 * seconds have passed, then calls `done`. `tick` runs first each frame, for DOM state.
 */
export function useCanvasTimeline(
  canvas: Ref<HTMLCanvasElement | undefined>,
  end: number,
  frame: (f: Frame) => void,
  { tick, done }: { tick?: (t: number) => void; done: () => void }
) {
  let raf = 0;
  let started = 0;

  const loop = () => {
    raf = requestAnimationFrame(loop);
    const t = (performance.now() - started) / 1000;
    tick?.(t);
    if (t >= end) {
      cancelAnimationFrame(raf);
      done();
      return;
    }
    const el = canvas.value;
    if (!el) return;
    const dpr = Math.min(window.devicePixelRatio, 2);
    const W = el.clientWidth;
    const H = el.clientHeight;
    if (el.width !== Math.round(W * dpr) || el.height !== Math.round(H * dpr)) {
      el.width = Math.round(W * dpr);
      el.height = Math.round(H * dpr);
    }
    const ctx = el.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = 1;
    // fit both ways, so narrower or taller screens don't push content off the edges
    const k = Math.min(H / 1080, W / 1920);
    ambient(ctx, t, W, H, k);
    // the caption takes the bottom ~22%, the touch hint the top ~9%
    frame({ ctx, t, W, H, k, safe: { top: H * 0.09, bottom: H * 0.77 } });
    ctx.globalAlpha = 1;
  };

  onMounted(() => {
    started = performance.now();
    loop();
  });
  onBeforeUnmount(() => cancelAnimationFrame(raf));
}

/** Picks the scene whose start time is the latest one not after `t`. */
export const sceneAt = <S extends string>(t: number, starts: [S, number][]) =>
  starts.reduce<S>((current, [scene, start]) => (t >= start ? scene : current), starts[0][0]);

/** The largest font size up to `size` at which `value` fits in `maxWidth`. */
export function fitSize(ctx: CanvasRenderingContext2D, value: string, maxWidth: number, size: number, weight = 600, font = FONT) {
  ctx.font = `${weight} ${size}px ${font}`;
  const width = ctx.measureText(value).width;
  return width > maxWidth ? Math.max(size * 0.55, (size * maxWidth) / width) : size;
}

/**
 * A white callout whose tail points at (x, y), sitting above it (or below with
 * `below`). Pops in with a slight scale as `alpha` rises, instead of a muddy fade.
 */
export function callout(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  title: string,
  sub: string,
  k: number,
  alpha = 1,
  { below = false, tail = true } = {}
) {
  if (alpha <= 0.003) return;
  title = canvasText(title);
  sub = canvasText(sub);
  ctx.save();
  ctx.font = `600 ${20 * k}px ${FONT}`;
  const titleWidth = ctx.measureText(title).width;
  ctx.font = `500 ${16 * k}px ${FONT}`;
  const w = Math.max(titleWidth, sub ? ctx.measureText(sub).width : 0) + 32 * k;
  const h = (sub ? 60 : 40) * k;
  const gap = tail ? 9 * k : 0;
  // keep the bubble on screen; the tail still points at the target
  const bx = Math.min(Math.max(x, w / 2 + 12 * k), ctx.canvas.clientWidth - w / 2 - 12 * k);
  const top = below ? y + gap : y - gap - h;

  const pop = 0.9 + 0.1 * easeOut(alpha);
  ctx.globalAlpha *= easeOut(alpha);
  ctx.translate(bx, below ? top : top + h);
  ctx.scale(pop, pop);
  ctx.translate(-bx, below ? -top : -(top + h));

  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 18 * k;
  ctx.shadowOffsetY = 6 * k;
  ctx.fillStyle = paper();
  ctx.beginPath();
  ctx.roundRect(bx - w / 2, top, w, h, 8 * k);
  if (tail) {
    const tx = Math.min(Math.max(x, bx - w / 2 + 16 * k), bx + w / 2 - 16 * k);
    const edge = below ? top : top + h;
    const dir = below ? -1 : 1;
    ctx.moveTo(tx - 8 * k, edge);
    ctx.lineTo(tx, edge + dir * gap);
    ctx.lineTo(tx + 8 * k, edge);
  }
  ctx.fill();
  ctx.shadowColor = "transparent";

  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = paperInk();
  ctx.font = `600 ${20 * k}px ${FONT}`;
  ctx.fillText(title, bx, top + (sub ? 10 : 10) * k);
  if (sub) {
    ctx.fillStyle = paperMuted();
    ctx.font = `500 ${16 * k}px ${FONT}`;
    ctx.fillText(sub, bx, top + 35 * k);
  }
  ctx.restore();
}

/** Slowly drifting dust behind every showcase, for depth. */
const DUST = (() => {
  const random = mulberry32(3);
  return Array.from({ length: 70 }, () => ({
    x: random(),
    y: random(),
    r: 0.6 + random() * 1.6,
    speed: 0.004 + random() * 0.01,
    phase: random() * Math.PI * 2,
  }));
})();

function ambient(ctx: CanvasRenderingContext2D, t: number, W: number, H: number, k: number) {
  ctx.save();
  ctx.fillStyle = "#c9d6ff";
  for (const d of DUST) {
    const x = ((d.x + t * d.speed) % 1) * W;
    const y = (d.y + Math.sin(t * 0.2 + d.phase) * 0.01) * H;
    ctx.globalAlpha = 0.12 + 0.1 * Math.sin(t * 0.8 + d.phase);
    ctx.beginPath();
    ctx.arc(x, y, d.r * k * 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** A soft radial glow, e.g. behind something that should draw the eye. */
export function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha: number) {
  if (alpha <= 0.003) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, "transparent");
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
}

/** A text label centred on (x, y). */
export function text(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  size: number,
  {
    color = "#fff",
    weight = 600,
    align = "center" as CanvasTextAlign,
    alpha = 1,
    font = FONT,
    maxWidth = Infinity,
  } = {}
) {
  if (alpha <= 0.003) return;
  value = canvasText(value);
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = color;
  const fitted = maxWidth < Infinity ? fitSize(ctx, value, maxWidth, size, weight, font) : size;
  ctx.font = `${weight} ${fitted}px ${font}`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillText(value, x, y);
  ctx.restore();
}

/** An image, decoded off the main thread and scaled to the size it's drawn at. */
export type Picture = { ready: boolean; source?: ImageBitmap; width: number; height: number };

const pictures = new Map<string, Picture>();

/**
 * Starts loading `url` right away and returns a handle that becomes `ready` once the image
 * is decoded into a bitmap no larger than `maxSize`. Drawing an undecoded image decodes it
 * on the main thread mid-animation, which is what made frames stall.
 */
export function picture(url: string | undefined, maxSize = 400): Picture | undefined {
  if (!url) return undefined;
  let p = pictures.get(url);
  if (p) return p;
  const created: Picture = { ready: false, width: 0, height: 0 };
  pictures.set(url, created);
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.decoding = "async";
  img.src = url;
  img
    .decode()
    .then(() => {
      const s = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
      const width = Math.max(1, Math.round(img.naturalWidth * s));
      const height = Math.max(1, Math.round(img.naturalHeight * s));
      return createImageBitmap(img, { resizeWidth: width, resizeHeight: height, resizeQuality: "high" }).then(
        (bitmap) => Object.assign(created, { source: bitmap, width, height, ready: true })
      );
    })
    .catch(() => undefined);
  return created;
}

/** Warms up images an animation will need later, e.g. the team photos for its closing card. */
export const preloadPictures = (urls: (string | undefined)[], maxSize?: number) =>
  urls.forEach((u) => picture(u, maxSize));
