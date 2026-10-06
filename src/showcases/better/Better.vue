<template>
    <ShowcaseStage ref="stage" :scene="scene" :captions="captions" eyebrow="A BISS project funded by Horizon Europe"
        title="BETTER" tagline="Responsible data analytics in healthcare"
        outro="Privacy-preserving health research across Europe: 14 partners, 8 countries, 3 rare-disease use cases."
        url="better-health-project.eu" :members="members" />
</template>
<script setup lang="ts">
import { computed, ref } from "vue";
import ShowcaseStage from "../shared/ShowcaseStage.vue";
import {
    callout,
    ease,
    easeOut,
    FONT,
    Frame,
    glow,
    lerp,
    MONO,
    Point,
    progress,
    sceneAt,
    text,
    useCanvasTimeline,
    window01,
} from "../shared/anim";

defineProps<{ members: { photo?: string; title: string }[] }>();
const emit = defineEmits<{ done: [] }>();

/** Seconds into the animation at which each part starts. */
const T = { problem: 3.5, train: 9.5, local: 16, results: 22, ethics: 28, outro: 34, end: 40 };

type Scene = "intro" | "problem" | "train" | "local" | "results" | "ethics" | "outro";
const captions: Record<string, string> = {
    problem: "Rare-disease research needs data from many hospitals. But patient data can't simply be pooled.",
    train: "So BETTER sends the analysis to the data: the Personal Health Train.",
    local: "Each hospital runs it locally. Patient records never leave the building.",
    results: "Only aggregated results travel back, combined across borders.",
    ethics: "BISS builds ethical, legal and societal questions into every step of the data science.",
};

const stage = ref<InstanceType<typeof ShowcaseStage>>();
const canvas = computed(() => stage.value?.canvas);
const scene = ref<Scene>("intro");

const BLUE = "#6cb8ff";
const GREEN = "#5ee0a0";
const RED = "#ff4d4f";
const NAVY = "#0f1530";
const TAU = Math.PI * 2;

//#region Content

/** Illustrative hospitals ("Stations"), placed on an ellipse by parametric angle. */
const STATIONS = [
    { name: "Hospital A", phi: (-2 * Math.PI) / 3, color: "#6cb8ff" },
    { name: "Hospital B", phi: -Math.PI / 3, color: "#5ee0a0" },
    { name: "Hospital C", phi: 0, color: "#ffb347" },
    { name: "Hospital D", phi: Math.PI / 3, color: "#ff7eb6" },
    { name: "Hospital E", phi: (2 * Math.PI) / 3, color: "#4dd4c6" },
    { name: "Hospital F", phi: Math.PI, color: "#c38bff" },
];
/** The hospital the camera visits. */
const FOCUS = 2;

/** Ethical, Legal and Social Aspects. */
const ELSA = [
    { label: "Ethical", color: "#ffb347" },
    { label: "Legal", color: "#ff7eb6" },
    { label: "Societal", color: "#4dd4c6" },
];
/** Illustrative steps of a data science lifecycle. */
const STAGES = ["Question", "Data", "Analysis", "Model", "Use"];
/** Illustrative bar heights in the aggregated result. */
const BARS = [0.5, 0.82, 0.64, 0.92, 0.42];

//#endregion

//#region Layout

const layout = (W: number, k: number, safe: Frame["safe"]) => {
    const span = safe.bottom - safe.top;
    const cx = W / 2;
    const cy = safe.top + span * 0.5;
    const rx = Math.min(W * 0.34, span * 0.95);
    const ry = span * 0.36;
    const station = (i: number): Point => ({ x: cx + rx * Math.cos(STATIONS[i].phi), y: cy + ry * Math.sin(STATIONS[i].phi) });
    return { span, cx, cy, rx, ry, cw: 200 * k, ch: 124 * k, hubR: 52 * k, station };
};
type Layout = ReturnType<typeof layout>;

/** The track: a short spur down from the hub, then once around the ellipse of hospitals. */
const trackPath = (g: Layout, k: number) => {
    const n = 240;
    const pts: Point[] = [{ x: g.cx, y: g.cy + g.hubR + 40 * k }];
    for (let i = 0; i <= n; i++) {
        const phi = Math.PI / 2 + (i / n) * TAU;
        pts.push({ x: g.cx + g.rx * Math.cos(phi), y: g.cy + g.ry * Math.sin(phi) });
    }
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
    // distance along the track at which the train reaches each hospital
    const stops = STATIONS.map((s) => {
        const turn = (((s.phi - Math.PI / 2) % TAU) + TAU) % TAU;
        return cum[1 + Math.round((turn / TAU) * n)];
    });
    return { pts, cum, spur: cum[1], total: cum[cum.length - 1], stops };
};
type Track = ReturnType<typeof trackPath>;

const along = (track: Track, s: number): Point => {
    const { pts, cum } = track;
    if (s <= 0) return pts[0];
    for (let i = 1; i < pts.length; i++) {
        if (s <= cum[i]) {
            const q = (s - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
            return { x: lerp(pts[i - 1].x, pts[i].x, q), y: lerp(pts[i - 1].y, pts[i].y, q) };
        }
    }
    return pts[pts.length - 1];
};

//#endregion

//#region Drawing

/** A hospital "Station": a card with its own records. `scan` sweeps across them (0..1). */
const drawStation = (
    ctx: CanvasRenderingContext2D,
    p: Point,
    g: Layout,
    k: number,
    i: number,
    alpha: number,
    { lit = 0, docked = 0, scan = -1 } = {}
) => {
    if (alpha <= 0.003) return;
    const s = STATIONS[i];
    const x0 = p.x - g.cw / 2;
    const y0 = p.y - g.ch / 2;
    ctx.save();
    ctx.globalAlpha = alpha;
    if (lit > 0) glow(ctx, p.x, p.y, g.cw * 0.75, s.color, 0.35 * lit);
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 16 * k;
    ctx.shadowOffsetY = 5 * k;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.roundRect(x0, y0, g.cw, g.ch, 8 * k);
    ctx.fill();
    ctx.shadowColor = "transparent";
    if (lit > 0) {
        ctx.save();
        ctx.globalAlpha = alpha * lit;
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 3 * k;
        ctx.stroke();
        ctx.restore();
    }

    // header: hospital cross, name, and the docked analysis once the train has been
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.roundRect(x0 + 12 * k, y0 + 9 * k, 18 * k, 18 * k, 4 * k);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillRect(x0 + 19 * k, y0 + 12 * k, 4 * k, 12 * k);
    ctx.fillRect(x0 + 15 * k, y0 + 16 * k, 12 * k, 4 * k);
    text(ctx, s.name, x0 + 38 * k, y0 + 18 * k, 15 * k, { align: "left", color: "#111", weight: 700, maxWidth: g.cw - 90 * k });
    if (docked > 0) {
        const d = easeOut(docked);
        const bw = 34 * k * (0.6 + 0.4 * d);
        const bh = 20 * k * (0.6 + 0.4 * d);
        ctx.save();
        ctx.globalAlpha = alpha * Math.min(1, docked * 2);
        ctx.fillStyle = NAVY;
        ctx.beginPath();
        ctx.roundRect(x0 + g.cw - 12 * k - bw, y0 + 18 * k - bh / 2, bw, bh, 4 * k);
        ctx.fill();
        text(ctx, "{ }", x0 + g.cw - 12 * k - bw / 2, y0 + 18.5 * k, 12 * k * (0.6 + 0.4 * d), { color: BLUE, weight: 700, font: MONO });
        ctx.restore();
    }
    ctx.fillStyle = "#e6e9f2";
    ctx.fillRect(x0 + 10 * k, y0 + 34 * k, g.cw - 20 * k, 1.5 * k);

    // records: deliberately abstract, a person and two grey lines each
    const sweepX = x0 + 8 * k + scan * (g.cw - 16 * k);
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 2; c++) {
            const rp = recordAt(p, g, k, r, c);
            if (scan >= 0 && rp.x - 10 * k < sweepX) {
                ctx.save();
                ctx.globalAlpha = alpha * 0.18;
                ctx.fillStyle = s.color;
                ctx.beginPath();
                ctx.roundRect(rp.x - 10 * k, rp.y - 10 * k, 84 * k, 20 * k, 4 * k);
                ctx.fill();
                ctx.restore();
            }
            ctx.fillStyle = s.color;
            ctx.beginPath();
            ctx.arc(rp.x, rp.y, 6 * k, 0, TAU);
            ctx.fill();
            ctx.fillStyle = "#d4d9e4";
            ctx.fillRect(rp.x + 12 * k, rp.y - 5 * k, 56 * k, 4 * k);
            ctx.fillRect(rp.x + 12 * k, rp.y + 2 * k, 36 * k, 4 * k);
        }
    }
    if (scan >= 0 && scan <= 1) {
        const grad = ctx.createLinearGradient(sweepX - 30 * k, 0, sweepX, 0);
        grad.addColorStop(0, "transparent");
        grad.addColorStop(1, s.color);
        ctx.save();
        ctx.globalAlpha = alpha * 0.45 * Math.sin(scan * Math.PI);
        ctx.fillStyle = grad;
        ctx.fillRect(sweepX - 30 * k, y0 + 38 * k, 30 * k, g.ch - 46 * k);
        ctx.globalAlpha = alpha * Math.sin(scan * Math.PI);
        ctx.fillStyle = s.color;
        ctx.fillRect(sweepX - 1 * k, y0 + 38 * k, 2 * k, g.ch - 46 * k);
        ctx.restore();
    }
    ctx.restore();
};

const recordAt = (p: Point, g: Layout, k: number, row: number, col: number): Point => ({
    x: p.x - g.cw / 2 + 20 * k + col * 92 * k,
    y: p.y - g.ch / 2 + 52 * k + row * 26 * k,
});

/** One car of the train, centred on (x, y) and facing angle `a`. */
const drawCar = (ctx: CanvasRenderingContext2D, x: number, y: number, a: number, k: number, loco: boolean) => {
    const L = 44 * k;
    const h = 24 * k;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 8 * k;
    ctx.fillStyle = loco ? BLUE : "#fff";
    ctx.beginPath();
    ctx.roundRect(-L / 2, -h / 2, L, h, loco ? [4 * k, 11 * k, 11 * k, 4 * k] : 3 * k);
    ctx.fill();
    ctx.shadowColor = "transparent";
    if (loco) {
        ctx.fillStyle = NAVY;
        ctx.beginPath();
        ctx.roundRect(L * 0.08, -h * 0.3, L * 0.26, h * 0.6, 2 * k);
        ctx.fill();
    } else {
        ctx.fillStyle = "#c9d0de";
        for (let i = -2; i <= 2; i++) ctx.fillRect(i * L * 0.17 - 0.75 * k, -h * 0.36, 1.5 * k, h * 0.72);
    }
    ctx.restore();
};

const drawHub = (ctx: CanvasRenderingContext2D, x: number, y: number, R: number, k: number, alpha: number, sigma: number) => {
    if (alpha <= 0.003) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    glow(ctx, x, y, R * 2.4, BLUE, 0.35);
    ctx.fillStyle = NAVY;
    ctx.strokeStyle = BLUE;
    ctx.lineWidth = 2.5 * k;
    ctx.beginPath();
    ctx.arc(x, y, R, 0, TAU);
    ctx.fill();
    ctx.stroke();
    // a researcher's laptop, turning into the sum of everyone's results
    ctx.globalAlpha = alpha * (1 - sigma);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2.5 * k;
    ctx.beginPath();
    ctx.roundRect(x - R * 0.42, y - R * 0.34, R * 0.84, R * 0.52, 3 * k);
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.roundRect(x - R * 0.56, y + R * 0.24, R * 1.12, R * 0.1, 2 * k);
    ctx.fill();
    ctx.globalAlpha = alpha;
    text(ctx, "Σ", x, y + R * 0.04, R * 0.95, { weight: 700, alpha: sigma });
    ctx.restore();
};

/** Database cylinder, as the tempting but forbidden central pool. */
const drawCylinder = (ctx: CanvasRenderingContext2D, x: number, y: number, k: number) => {
    const w = 64 * k;
    const h = 76 * k;
    const e = 12 * k;
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 2.5 * k;
    ctx.beginPath();
    ctx.ellipse(x, y - h / 2, w / 2, e, 0, 0, TAU);
    ctx.moveTo(x - w / 2, y - h / 2);
    ctx.lineTo(x - w / 2, y + h / 2);
    ctx.ellipse(x, y + h / 2, w / 2, e, 0, Math.PI, 0, true);
    ctx.lineTo(x + w / 2, y - h / 2);
    ctx.fill();
    ctx.stroke();
    for (const f of [-0.15, 0.18]) {
        ctx.beginPath();
        ctx.ellipse(x, y + f * h, w / 2, e, 0, 0, Math.PI);
        ctx.stroke();
    }
    ctx.restore();
};

//#endregion

const draw = ({ ctx, t, W, k, safe }: Frame) => {
    const g = layout(W, k, safe);
    const { cx, cy, hubR } = g;
    const track = trackPath(g, k);

    const net = progress(t, T.problem, T.problem + 0.6) * (1 - progress(t, T.ethics - 0.4, T.ethics + 0.3));

    // train: down the spur, a pause to introduce it, then once around all hospitals
    const head =
        track.spur * easeOut(progress(t, T.train + 1.1, T.train + 2.1)) +
        (track.total - track.spur) * ease(progress(t, T.train + 3.7, T.local - 0.2));
    const visited = (i: number) => progress(head, track.stops[i] - 10 * k, track.stops[i] + 30 * k);

    // the camera dives into one hospital and comes back out
    const zp = ease(progress(t, T.local + 0.1, T.local + 1.5)) * (1 - ease(progress(t, T.results - 0.3, T.results + 0.9)));
    const Z = (g.span * 0.48) / g.ch;
    const z = Math.pow(Z, zp);
    const focus = g.station(FOCUS);
    const camFrom = { x: lerp(cx, focus.x, zp), y: lerp(cy, focus.y, zp) };
    const camTo = { x: lerp(cx, W * 0.4, zp), y: cy };
    const screen = (p: Point): Point => ({ x: camTo.x + (p.x - camFrom.x) * z, y: camTo.y + (p.y - camFrom.y) * z });
    const others = 1 - Math.min(1, zp * 2.5);

    if (net > 0.003) {
        ctx.save();
        ctx.translate(camTo.x, camTo.y);
        ctx.scale(z, z);
        ctx.translate(-camFrom.x, -camFrom.y);

        //#region track
        const rails = easeOut(progress(t, T.train + 0.3, T.train + 1.3));
        const trackAlpha = net * others * (1 - progress(t, T.results + 0.4, T.results + 1.2));
        if (rails > 0 && trackAlpha > 0.003) {
            const start = Math.PI / 2;
            const end = start + TAU * rails;
            ctx.globalAlpha = trackAlpha;
            ctx.lineCap = "butt";
            ctx.strokeStyle = "rgba(255,255,255,0.13)";
            ctx.lineWidth = 12 * k;
            ctx.setLineDash([2.5 * k, 8 * k]);
            ctx.beginPath();
            ctx.ellipse(cx, cy, g.rx, g.ry, 0, start, end);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(track.pts[0].x, track.pts[0].y);
            ctx.lineTo(track.pts[0].x, lerp(track.pts[0].y, track.pts[1].y, rails));
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.strokeStyle = "rgba(108,184,255,0.45)";
            ctx.lineWidth = 2 * k;
            for (const d of [-4.5 * k, 4.5 * k]) {
                ctx.beginPath();
                ctx.ellipse(cx, cy, g.rx + d, g.ry + d, 0, start, end);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(track.pts[0].x + d, track.pts[0].y);
                ctx.lineTo(track.pts[0].x + d, lerp(track.pts[0].y, track.pts[1].y + d * 0.2, rails));
                ctx.stroke();
            }
        }
        //#endregion

        //#region the train
        const trainAlpha = net * (1 - progress(t, T.local - 0.1, T.local + 0.5));
        if (head > 0 && trainAlpha > 0.003) {
            const front = along(track, head);
            glow(ctx, front.x, front.y, 70 * k, BLUE, trainAlpha * 0.6);
            for (let c = 2; c >= 0; c--) {
                const s = head - 22 * k - c * 50 * k;
                if (s <= 0) continue;
                const a = along(track, s - 4 * k);
                const b = along(track, s + 4 * k);
                const p = along(track, s);
                ctx.globalAlpha = trainAlpha * Math.min(1, s / (24 * k));
                drawCar(ctx, p.x, p.y, Math.atan2(b.y - a.y, b.x - a.x), k, c === 0);
                if (c > 0) text(ctx, "{ }", p.x, p.y + 0.5 * k, 12 * k, { color: NAVY, weight: 800, font: MONO });
            }
        }
        //#endregion

        //#region a central pool, blocked
        const poolIn = progress(t, T.problem + 1.1, T.problem + 1.7) * (1 - progress(t, T.train - 0.6, T.train + 0.1));
        const Rb = 118 * k;
        if (poolIn > 0.003) {
            ctx.globalAlpha = net * poolIn;
            drawCylinder(ctx, cx, cy, k);
            const barrier = progress(t, T.problem + 2.9, T.problem + 3.2);
            if (barrier > 0) {
                const pulse = 0.75 + 0.25 * Math.sin(t * 6);
                ctx.globalAlpha = net * poolIn * barrier;
                glow(ctx, cx, cy, Rb * 1.4, RED, 0.25 * pulse);
                ctx.fillStyle = "rgba(255,77,79,0.07)";
                ctx.strokeStyle = RED;
                ctx.lineWidth = 3 * k;
                ctx.beginPath();
                ctx.arc(cx, cy, Rb, 0, TAU);
                ctx.fill();
                ctx.stroke();
                ctx.font = `800 ${15 * k}px ${FONT}`;
                const pw = ctx.measureText("GDPR").width + 24 * k;
                ctx.fillStyle = RED;
                ctx.beginPath();
                ctx.roundRect(cx - pw / 2, cy + Rb - 13 * k, pw, 26 * k, 13 * k);
                ctx.fill();
                text(ctx, "GDPR", cx, cy + Rb, 15 * k, { weight: 800 });
            }
            const cross = easeOut(progress(t, T.problem + 3.5, T.problem + 4));
            if (cross > 0) {
                ctx.globalAlpha = net * poolIn;
                ctx.strokeStyle = RED;
                ctx.lineWidth = 7 * k;
                ctx.lineCap = "round";
                const r = 34 * k * cross;
                ctx.beginPath();
                ctx.moveTo(cx - r, cy - r);
                ctx.lineTo(cx + r, cy + r);
                ctx.moveTo(cx + r, cy - r);
                ctx.lineTo(cx - r, cy + r);
                ctx.stroke();
                ctx.lineCap = "butt";
            }
        }
        // copies of records try to leave for the pool, and bounce off the rules
        STATIONS.forEach((s, i) => {
            for (let r = 0; r < 3; r++) {
                const t0 = T.problem + 2.1 + i * 0.12 + r * 0.3;
                const out = progress(t, t0, t0 + 0.9);
                const back = progress(t, t0 + 0.9, t0 + 1.6);
                if (out <= 0 || back >= 1) continue;
                const from = recordAt(g.station(i), g, k, r, 0);
                const dx = from.x - cx;
                const dy = from.y - cy;
                const len = Math.hypot(dx, dy);
                const hit = { x: cx + (dx / len) * (Rb + 8 * k), y: cy + (dy / len) * (Rb + 8 * k) };
                const p =
                    back > 0
                        ? { x: lerp(hit.x, from.x, easeOut(back)), y: lerp(hit.y, from.y, easeOut(back)) }
                        : { x: lerp(from.x, hit.x, ease(out)), y: lerp(from.y, hit.y, ease(out)) };
                ctx.globalAlpha = net * (1 - back);
                glow(ctx, p.x, p.y, 18 * k, back > 0 ? RED : s.color, 0.8);
                ctx.fillStyle = s.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 6 * k, 0, TAU);
                ctx.fill();
            }
        });
        //#endregion

        //#region spokes and results
        const spokes = progress(t, T.results + 0.8, T.results + 1.4);
        const arrive = (i: number) => T.results + 2.2 + i * 0.25;
        if (spokes > 0) {
            ctx.globalAlpha = net * spokes * 0.45;
            ctx.strokeStyle = "rgba(255,255,255,0.6)";
            ctx.lineWidth = 1.5 * k;
            ctx.setLineDash([6 * k, 7 * k]);
            STATIONS.forEach((_, i) => {
                const p = g.station(i);
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(p.x, p.y);
                ctx.stroke();
            });
            ctx.setLineDash([]);
        }
        //#endregion

        //#region hospitals
        STATIONS.forEach((_, i) => {
            const pop = easeOut(progress(t, T.problem + 0.1 + i * 0.12, T.problem + 0.7 + i * 0.12));
            if (pop <= 0) return;
            const p = g.station(i);
            const a = net * pop * (i === FOCUS ? 1 : others);
            const update = T.results + 4.3;
            const flash = window01(t, update + 0.7, update + 1.6, 0.3);
            const scan = i === FOCUS ? progress(t, T.local + 2, T.local + 3.4) : 0;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.scale(0.85 + 0.15 * pop, 0.85 + 0.15 * pop);
            ctx.translate(-p.x, -p.y);
            drawStation(ctx, p, g, k, i, a, {
                lit: Math.max(visited(i) * (1 - progress(t, T.local + 0.5, T.local + 1.2)), flash),
                docked: visited(i),
                scan: scan > 0 && scan < 1 ? ease(scan) : -1,
            });
            ctx.restore();
        });
        //#endregion

        //#region the firewall around the hospital in focus
        const wall = progress(t, T.local + 1.3, T.local + 1.9) * (1 - progress(t, T.results - 0.6, T.results - 0.2));
        if (wall > 0) {
            const pad = 14 * k;
            const x0 = focus.x - g.cw / 2 - pad;
            const y0 = focus.y - g.ch / 2 - pad;
            ctx.globalAlpha = net * wall;
            ctx.strokeStyle = GREEN;
            ctx.lineWidth = 1.5 * k;
            ctx.setLineDash([6 * k, 4 * k]);
            ctx.lineDashOffset = -t * 12 * k;
            ctx.beginPath();
            ctx.roundRect(x0, y0, g.cw + pad * 2, g.ch + pad * 2, 12 * k);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.lineDashOffset = 0;
            ctx.font = `700 ${8 * k}px ${FONT}`;
            const lw = ctx.measureText("FIREWALL").width + 12 * k;
            ctx.fillStyle = "#06201d";
            ctx.beginPath();
            ctx.roundRect(x0 + 14 * k, y0 - 6 * k, lw, 12 * k, 6 * k);
            ctx.fill();
            ctx.strokeStyle = GREEN;
            ctx.lineWidth = 1 * k;
            ctx.stroke();
            text(ctx, "FIREWALL", x0 + 14 * k + lw / 2, y0 + 0.3 * k, 8 * k, { color: GREEN, weight: 700 });
        }
        //#endregion

        //#region results travel to the hub, and an update travels back
        STATIONS.forEach((s, i) => {
            const f = progress(t, arrive(i) - 1, arrive(i));
            if (f <= 0 || f >= 1) return;
            const from = g.station(i);
            const e = ease(f);
            const p = { x: lerp(from.x, cx, e), y: lerp(from.y, cy, e) };
            const a = net * progress(f, 0, 0.15) * (1 - progress(f, 0.85, 1));
            ctx.globalAlpha = a;
            glow(ctx, p.x, p.y, 34 * k, s.color, 0.9);
            ctx.fillStyle = "#fff";
            ctx.beginPath();
            ctx.roundRect(p.x - 17 * k, p.y - 12 * k, 34 * k, 24 * k, 5 * k);
            ctx.fill();
            text(ctx, "Σ", p.x, p.y + 0.5 * k, 15 * k, { color: "#111", weight: 800 });
        });
        const update = T.results + 4.3;
        STATIONS.forEach((_, i) => {
            const f = progress(t, update, update + 0.9);
            if (f <= 0 || f >= 1) return;
            const to = g.station(i);
            const e = ease(f);
            const p = { x: lerp(cx, to.x, e), y: lerp(cy, to.y, e) };
            ctx.globalAlpha = net * (1 - progress(f, 0.8, 1));
            glow(ctx, p.x, p.y, 26 * k, BLUE, 0.9);
            ctx.fillStyle = "#fff";
            ctx.beginPath();
            ctx.arc(p.x, p.y, 5 * k, 0, TAU);
            ctx.fill();
        });
        //#endregion

        //#region hub
        const hubIn = easeOut(progress(t, T.train - 0.2, T.train + 0.6));
        const hubAlpha = net * hubIn * others;
        if (hubAlpha > 0.003) {
            const sigma = progress(t, T.results + 0.6, T.results + 1.2);
            const combined = progress(t, arrive(5), arrive(5) + 0.6);
            ctx.globalAlpha = 1;
            if (combined > 0) glow(ctx, cx, cy, hubR * 3.4, GREEN, hubAlpha * combined * (0.5 + 0.15 * Math.sin(t * 4)));
            ctx.save();
            ctx.translate(cx, cy);
            ctx.scale(0.8 + 0.2 * hubIn, 0.8 + 0.2 * hubIn);
            ctx.translate(-cx, -cy);
            drawHub(ctx, cx, cy, hubR, k, hubAlpha, sigma);
            ctx.restore();
            // one ring segment per hospital whose result has arrived
            STATIONS.forEach((s, i) => {
                const f = progress(t, arrive(i) - 0.1, arrive(i) + 0.25);
                if (f <= 0) return;
                const a0 = -Math.PI / 2 + (i / STATIONS.length) * TAU + 0.06;
                const a1 = a0 + (TAU / STATIONS.length - 0.12) * easeOut(f);
                ctx.globalAlpha = hubAlpha;
                ctx.strokeStyle = s.color;
                ctx.lineWidth = 6 * k;
                ctx.lineCap = "round";
                ctx.beginPath();
                ctx.arc(cx, cy, hubR + 11 * k, a0, a1);
                ctx.stroke();
                ctx.lineCap = "butt";
            });
            ctx.globalAlpha = hubAlpha;
            const labelY = cy + hubR + 26 * k;
            text(ctx, "Researcher", cx, labelY, 17 * k, { weight: 600, color: "rgba(255,255,255,0.8)", alpha: 1 - sigma });
            text(ctx, "Aggregator", cx, labelY, 17 * k, { weight: 600, color: "rgba(255,255,255,0.8)", alpha: sigma });
        }
        //#endregion

        ctx.restore();
        ctx.globalAlpha = 1;

        //#region screen-space labels
        callout(ctx, cx, cy - Rb - 6 * k, "One central data pool", "not allowed across borders", k, net * window01(t, T.problem + 3.6, T.train - 0.3, 0.4));
        callout(ctx, cx, cy + g.ry + 16 * k, "Personal Health Train", "an analysis, packed in a container", k, net * window01(t, T.train + 1.8, T.train + 3.9, 0.4), { below: true });

        const bottom = screen({ x: focus.x, y: focus.y + g.ch / 2 + 14 * k });
        callout(ctx, bottom.x, bottom.y + 4 * k, "Patient records", "never leave the hospital", k, net * window01(t, T.local + 2.2, T.results - 0.5, 0.4), { below: true });

        // the aggregated result leaves through the firewall
        const chipIn = progress(t, T.local + 3.4, T.local + 3.8) * (1 - progress(t, T.results - 0.7, T.results - 0.3));
        if (chipIn > 0.003) {
            const from = screen({ x: focus.x + g.cw / 2, y: focus.y });
            const e = easeOut(progress(t, T.local + 3.4, T.local + 4.4));
            // a little larger than the rest, to hold its own beside the zoomed-in card
            const u = 1.35 * k;
            const cw = 280 * u;
            const chH = 140 * u;
            const x = lerp(from.x, W * 0.78, e) - cw / 2;
            const y = cy - chH / 2;
            ctx.save();
            ctx.globalAlpha = net * chipIn;
            glow(ctx, x + cw / 2, cy, cw * 0.7, "#ffb347", 0.35);
            ctx.shadowColor = "rgba(0,0,0,0.35)";
            ctx.shadowBlur = 18 * u;
            ctx.shadowOffsetY = 6 * u;
            ctx.fillStyle = "#fff";
            ctx.beginPath();
            ctx.roundRect(x, y, cw, chH, 8 * u);
            ctx.fill();
            ctx.shadowColor = "transparent";
            text(ctx, "Aggregated result", x + 20 * u, y + 28 * u, 20 * u, { align: "left", color: "#000", maxWidth: cw - 40  * u });
            const bw = 26 * u;
            BARS.forEach((b, i) => {
                const grow = easeOut(progress(t, T.local + 4.2 + i * 0.08, T.local + 4.8 + i * 0.08));
                const bh = 46  * u * b * grow;
                ctx.fillStyle = "#ffb347";
                ctx.beginPath();
                ctx.roundRect(x + 20  * u + i * (bw + 8 * u), y + 100  * u - bh, bw, Math.max(bh, 0.1), 3 * u);
                ctx.fill();
            });
            ctx.fillStyle = "#e6e9f2";
            ctx.fillRect(x + 20 * u, y + 100 * u, cw - 40 * u, 1.5 * u);
            text(ctx, "summary statistics only", x + 20 * u, y + 120 * u, 15 * u, { align: "left", color: "#4b4b4b", weight: 500, maxWidth: cw - 40  * u });
            ctx.restore();
        }

        callout(ctx, cx, cy - hubR - 20 * k, "Combined insight", "not a single patient record moved", k, net * window01(t, arrive(5) + 0.3, T.ethics - 0.3, 0.4));
        //#endregion
    }

    //#region a data science lifecycle with ethics woven in
    const ea = progress(t, T.ethics + 0.3, T.ethics + 0.9) * (1 - progress(t, T.outro, T.outro + 0.8));
    if (ea > 0.003) {
        const Rl = Math.min(g.span * 0.33, W * 0.2);
        const ring = easeOut(progress(t, T.ethics + 0.3, T.ethics + 1.3));
        const top = -Math.PI / 2;
        const lead = 0.35;
        const u = ease(progress(t, T.ethics + 1.9, T.ethics + 4.9));
        const comet = top - lead + (TAU + lead) * u;
        const angleOf = (i: number) => top + (i / STAGES.length) * TAU;

        ctx.save();
        ctx.globalAlpha = ea;
        glow(ctx, cx, cy, Rl * 1.3, BLUE, 0.18);
        ctx.strokeStyle = "rgba(255,255,255,0.22)";
        ctx.lineWidth = 2 * k;
        ctx.beginPath();
        ctx.arc(cx, cy, Rl, top, top + TAU * ring);
        ctx.stroke();

        // three threads, one per aspect, braided in behind the comet
        if (u > 0) {
            ELSA.forEach((e, j) => {
                ctx.strokeStyle = e.color;
                ctx.lineWidth = 3 * k;
                ctx.lineCap = "round";
                ctx.globalAlpha = ea * 0.9;
                ctx.beginPath();
                for (let a = top - lead; a <= comet; a += 0.02) {
                    const r = Rl + Math.sin(a * 5 + (j * TAU) / 3 + t * 1.5) * 7 * k;
                    const x = cx + Math.cos(a) * r;
                    const y = cy + Math.sin(a) * r;
                    if (a === top - lead) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.stroke();
                ctx.lineCap = "butt";
            });
            if (u < 1) {
                const hx = cx + Math.cos(comet) * Rl;
                const hy = cy + Math.sin(comet) * Rl;
                ctx.globalAlpha = ea;
                glow(ctx, hx, hy, 40 * k, "#fff", 0.7);
                ctx.fillStyle = "#fff";
                ctx.beginPath();
                ctx.arc(hx, hy, 6 * k, 0, TAU);
                ctx.fill();
            }
        }

        // the lifecycle's steps, each getting all three aspects as the comet passes
        STAGES.forEach((label, i) => {
            const pop = easeOut(progress(t, T.ethics + 0.6 + i * 0.12, T.ethics + 1.1 + i * 0.12));
            if (pop <= 0) return;
            const a = angleOf(i);
            const x = cx + Math.cos(a) * Rl;
            const y = cy + Math.sin(a) * Rl;
            const done = u > 0 ? progress(comet, a - 0.05, a + 0.2) : 0;
            ctx.font = `600 ${19 * k}px ${FONT}`;
            const pw = ctx.measureText(label).width + 36 * k;
            const ph = 42 * k;
            const s = 0.85 + 0.15 * pop + 0.06 * Math.sin(done * Math.PI);
            ctx.save();
            ctx.globalAlpha = ea * pop;
            ctx.translate(x, y);
            ctx.scale(s, s);
            if (done > 0) glow(ctx, 0, 0, pw * 0.8, GREEN, 0.3 * done);
            ctx.shadowColor = "rgba(0,0,0,0.35)";
            ctx.shadowBlur = 14 * k;
            ctx.shadowOffsetY = 4 * k;
            ctx.fillStyle = "#fff";
            ctx.beginPath();
            ctx.roundRect(-pw / 2, -ph / 2, pw, ph, 8 * k);
            ctx.fill();
            ctx.shadowColor = "transparent";
            text(ctx, label, 0, 0.5 * k, 19 * k, { color: "#000" });
            ELSA.forEach((e, j) => {
                const d = easeOut(progress(done, j * 0.2, j * 0.2 + 0.5));
                if (d <= 0) return;
                ctx.fillStyle = e.color;
                ctx.beginPath();
                ctx.arc((j - 1) * 14 * k, ph / 2 + 10 * k, 4.5 * k * d, 0, TAU);
                ctx.fill();
            });
            ctx.restore();
        });

        // the centre: what is being woven in
        ctx.globalAlpha = ea;
        text(ctx, "Data science lifecycle", cx, cy - 38 * k, 24 * k, { weight: 700, maxWidth: Rl * 1.5, alpha: ring });
        ctx.font = `700 ${16 * k}px ${FONT}`;
        const gap = 10 * k;
        const widths = ELSA.map((e) => ctx.measureText(e.label).width + 26 * k);
        let left = cx - (widths.reduce((a, b) => a + b, 0) + gap * (ELSA.length - 1)) / 2;
        ELSA.forEach((e, j) => {
            const f = easeOut(progress(t, T.ethics + 1.2 + j * 0.15, T.ethics + 1.7 + j * 0.15));
            if (f > 0) {
                const y = cy + 6 * k + (1 - f) * 12 * k;
                ctx.save();
                ctx.globalAlpha = ea * f;
                ctx.fillStyle = e.color;
                ctx.beginPath();
                ctx.roundRect(left, y - 15 * k, widths[j], 30 * k, 15 * k);
                ctx.fill();
                text(ctx, e.label, left + widths[j] / 2, y + 0.5 * k, 16 * k, { color: "#000", weight: 700 });
                ctx.restore();
            }
            left += widths[j] + gap;
        });
        text(ctx, "with tools from the social sciences and humanities", cx, cy + 50 * k, 15 * k, {
            weight: 500,
            color: "rgba(255,255,255,0.7)",
            maxWidth: Rl * 1.45,
            alpha: progress(t, T.ethics + 2.2, T.ethics + 2.8),
        });
        ctx.restore();
    }
    //#endregion
};

const updateDom = (t: number) => {
    const next = sceneAt<Scene>(t, [
        ["intro", 0],
        ["problem", T.problem],
        ["train", T.train],
        ["local", T.local],
        ["results", T.results],
        ["ethics", T.ethics],
        ["outro", T.outro],
    ]);
    if (scene.value !== next) scene.value = next;
};

useCanvasTimeline(canvas, T.end, draw, { tick: updateDom, done: () => emit("done") });
</script>
