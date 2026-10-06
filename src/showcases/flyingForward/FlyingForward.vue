<template>
    <ShowcaseStage ref="stage" :scene="scene" :captions="captions" eyebrow="A BISS project funded by EU Horizon 2020"
        title="Flying Forward" tagline="Drones that fly on their own, and by the rules"
        outro="Making drone laws machine-readable, so autonomous drones can follow the rules wherever they fly."
        url="ff2020.eu" :partners="['Brainport Development', 'EUROUSC Italia', 'Maastricht University', 'VERSES']"
        :funders="['European Union (Horizon 2020)']" :members="members" />
</template>
<script setup lang="ts">
import { computed, ref } from "vue";
import { theme as screenTheme } from "../../i18n";
import ShowcaseStage from "../shared/ShowcaseStage.vue";
import {
    ease,
    easeOut,
    FONT,
    Frame,
    glow,
    lerp,
    MONO,
    mulberry32,
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
const T = { missions: 3.5, layers: 8.5, code: 14, fly: 21, labs: 28, outro: 34, credits: 40, end: 46 };

type Scene = "intro" | "missions" | "layers" | "code" | "fly" | "labs" | "outro" | "credits";
const captions: Record<string, string> = {
    missions: "Drones that fly on their own could deliver parcels, meals and defibrillators, or inspect buildings.",
    layers: "But which rules apply? Those of the region, the country and the EU, all at once.",
    code: "Flying Forward turns drone laws into rules a machine can read and execute.",
    fly: "So the drone checks the rules itself, and plans a route that follows them.",
    labs: "Tested in living labs in five European cities.",
};

const stage = ref<InstanceType<typeof ShowcaseStage>>();
const canvas = computed(() => stage.value?.canvas);
const scene = ref<Scene>("intro");

const BLUE = "#6cb8ff";
const GREEN = "#5ee0a0";
const ORANGE = "#ffb347";
const PINK = "#ff7eb6";
const TEAL = "#4dd4c6";
const RED = "#ff4d4f";
// The shared stage inverts legacy canvas art for light mode. Paint the paper
// surfaces in inverse source colours so they stay white with dark lettering.
const paper = () => screenTheme.value === "light" ? "#000" : "#fff";
const paperInk = () => screenTheme.value === "light" ? "#f5efdb" : "#0a1024";
const paperMuted = () => screenTheme.value === "light" ? "#c8beae" : "#374151";

//#region An illustrative city, on an isometric grid of N × N blocks

const N = 8;
/** Where the city sits on screen: centre x, y of the back corner, half the ground's width. */
type View = { cx: number; y0: number; A: number };
/** Grid (u, w) and height z, all in blocks, to screen. */
const iso = (v: View, u: number, w: number, z = 0): Point => ({
    x: v.cx + ((u - w) * v.A) / N,
    y: v.y0 + ((u + w) * v.A) / (2 * N) - (z * v.A) / N,
});
const lerpView = (a: View, b: View, f: number): View => ({ cx: lerp(a.cx, b.cx, f), y0: lerp(a.y0, b.y0, f), A: lerp(a.A, b.A, f) });

const inPark = (i: number, j: number) => i >= 3 && i < 5 && j >= 3 && j < 5;
const inAirfield = (i: number, j: number) => i < 2 && j < 2;
/** Blocks the story needs: the drone base, the stops and the destination. */
const FIXED: Record<string, number> = { "1,6": 1.3, "3,6": 0.5, "6,4": 0.7, "5,1": 2.2, "6,1": 0.8 };
type Building = { i: number; j: number; h: number; lit: number[] };
const BUILDINGS: Building[] = (() => {
    const random = mulberry32(11);
    const list: Building[] = [];
    for (let s = 0; s <= 2 * (N - 1); s++) {
        for (let i = 0; i < N; i++) {
            const j = s - i;
            if (j < 0 || j >= N || inPark(i, j) || inAirfield(i, j)) continue;
            const fixed = FIXED[`${i},${j}`];
            const r = random();
            const h = 0.45 + random() * 1.4;
            const lit = Array.from({ length: 12 }, () => random());
            if (fixed === undefined && r < 0.2) continue;
            list.push({ i, j, h: fixed ?? h, lit });
        }
    }
    return list;
})();

const ZC = 3.2; // the altitude ceiling, in blocks
const DEPOT = { u: 1.5, w: 6.5, z: 1.45 };
const DEST = { u: 6.5, w: 1.5, z: 0.95 };

/** Delivery stops in the first scene, in the order the drone visits them. */
const STOPS = [
    { label: "Parcels", color: ORANGE, u: 3.5, w: 6.5, z: 0.5 },
    { label: "Meals", color: PINK, u: 6.5, w: 4.5, z: 0.7 },
    { label: "Building inspections", color: BLUE, u: 5.5, w: 1.5, z: 2.2 },
    { label: "Defibrillators", color: GREEN, u: 4, w: 4, z: 0 },
];
/** Drone keyframes for the first two scenes: [time, u, w, z]. */
const FLIGHT: [number, number, number, number][] = [
    [T.missions + 0.3, DEPOT.u, DEPOT.w, DEPOT.z],
    [T.missions + 0.9, DEPOT.u, DEPOT.w, 2.7],
    [T.missions + 1.7, 3.5, 6.5, 2.7],
    [T.missions + 1.9, 3.5, 6.5, 2.7],
    [T.missions + 2.6, 6.5, 4.5, 2.7],
    [T.missions + 2.8, 6.5, 4.5, 2.7],
    [T.missions + 3.5, 6.3, 2.6, 2.9],
    [T.missions + 3.7, 6.3, 2.6, 2.9],
    [T.missions + 4.5, 4, 4, 2.7],
    [T.layers + 0.8, 4, 4, 2],
];
const STOP_AT = [T.missions + 1.75, T.missions + 2.65, T.missions + 3.55, T.missions + 4.5];

const flightAt = (t: number) => {
    let i = 0;
    while (i < FLIGHT.length - 2 && t > FLIGHT[i + 1][0]) i++;
    const [t0, u0, w0, z0] = FLIGHT[i];
    const [t1, u1, w1, z1] = FLIGHT[i + 1];
    const f = ease(progress(t, t0, t1));
    return { u: lerp(u0, u1, f), w: lerp(w0, w1, f), z: lerp(z0, z1, f) };
};

/** The rules in force, from the largest area down; their colours stay the same throughout. */
const LAYERS = [
    { name: "European Union", rule: "Stay below 120 m", short: "Altitude ≤ 120 m", tag: "EU", color: BLUE, z: 8.2 },
    { name: "Country", rule: "No-fly zone around the airport", short: "Outside airport zone", tag: "Country", color: ORANGE, z: 5.8 },
    { name: "Region", rule: "No drones over the city park", short: "Not over the park", tag: "Region", color: PINK, z: 3.4 },
];

//#endregion

//#region Legal text and its machine-readable form (illustrative)

const LAW: [string, string][] = [
    ["EN", "Drones must not fly higher than 120 metres above the ground."],
    ["NL", "Drones mogen niet hoger dan 120 meter boven de grond vliegen."],
    ["IT", "I droni non devono volare a più di 120 metri dal suolo."],
    ["ES", "Los drones no deben volar a más de 120 metros sobre el suelo."],
    ["ET", "Droonid ei tohi lennata maapinnast kõrgemal kui 120 meetrit."],
    ["FI", "Droonit eivät saa lentää yli 120 metrin korkeudella maasta."],
];
const LANG_START = T.code + 4.3;
const LANG_STEP = 0.48;
const CODE = [
    { key: "rule", value: "max_altitude", color: "#e6e9f5" },
    { key: "applies to", value: "drone", color: TEAL },
    { key: "limit", value: "altitude ≤ 120 m", color: BLUE },
    { key: "scope", value: "European Union", color: GREEN },
];
/** Words that leave the legal text and land on a line of the rule. */
const TOKENS = [
    { label: "drone", word: 0, line: 1, color: TEAL },
    { label: "≤ 120 m", word: 6, line: 2, color: BLUE },
    { label: "EU", word: -1, line: 3, color: GREEN },
];
const tokenAt = (i: number) => T.code + 1.9 + i * 0.5;

//#endregion

//#region Europe, as a dot matrix (rough outline), and the five living labs

const LAT0 = 52;
const COS = Math.cos((LAT0 * Math.PI) / 180);
const LAND: [number, number][][] = [
    // mainland, from Portugal round the Mediterranean, up to Scandinavia and back via the Baltic
    [
        [-9.5, 43], [-8.9, 37], [-6, 36.5], [-2, 36.7], [0, 38.7], [0.5, 40.5], [3.2, 42], [3, 43.3], [6, 43.1],
        [7.5, 43.8], [8.8, 44.4], [10.5, 43.5], [12, 41.8], [15.6, 40], [16, 38], [17, 39], [18.5, 40.2], [16, 41.5],
        [13.5, 43.6], [12.3, 45.3], [13.7, 45.6], [15, 45], [19, 41.8], [19.5, 40], [21, 38], [23, 36.5], [24, 38],
        [23, 40], [26, 40.8], [29, 41.2], [28, 43.5], [30, 46], [32, 46.5], [32, 61], [30, 62.5], [29, 66], [28.5, 69.5],
        [25, 71], [20, 70], [15, 68], [12, 65], [10, 63.5], [5, 62], [5, 59], [7, 58], [10.5, 59], [11, 58.4],
        [12.8, 55.6], [14.2, 55.4], [16.5, 56.5], [18.5, 59.5], [17.2, 61.5], [21, 64], [25.3, 65.6], [21.5, 63],
        [21.3, 61], [22.5, 60], [26, 60.4], [30, 60.3], [28, 59.4], [23.5, 59.2], [21.5, 57.5], [21, 56], [19.5, 54.4],
        [14.2, 53.9], [11, 54], [10.5, 57.6], [8.2, 56.8], [8.5, 55], [7, 53.6], [4.7, 52.9], [3.5, 51.4], [1.6, 50.9],
        [-1.5, 49.7], [-4.7, 48.4], [-1.2, 46], [-1.8, 43.4], [-8, 43.7],
    ],
    // Great Britain
    [
        [-5.7, 50], [1.7, 51], [1.7, 52.8], [0, 53.5], [-1.5, 55], [-2, 56], [-1.8, 57.6], [-3.5, 58.6], [-5, 58.6],
        [-6.2, 56.5], [-5, 55], [-3, 54], [-4.7, 53.3], [-4.5, 52.2], [-5.3, 51.7], [-3, 51.4],
    ],
    // Ireland
    [[-6, 52], [-6, 54], [-7.5, 55.3], [-10, 54], [-10, 51.6]],
];
const inside = (x: number, y: number, poly: [number, number][]) => {
    let hit = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const [xi, yi] = poly[i];
        const [xj, yj] = poly[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
    }
    return hit;
};
const DOTS: { lon: number; lat: number }[] = (() => {
    const dots: { lon: number; lat: number }[] = [];
    const step = 0.62;
    for (let lat = 36; lat <= 71; lat += step) {
        for (let lon = -10.5; lon <= 32; lon += step / COS) {
            if (LAND.some((poly) => inside(lon, lat, poly))) dots.push({ lon, lat });
        }
    }
    return dots;
})();
const LABS = [
    { name: "Eindhoven", lon: 5.47, lat: 51.44, side: -1 },
    { name: "Milan", lon: 9.19, lat: 45.46, side: 1 },
    { name: "Zaragoza", lon: -0.88, lat: 41.65, side: -1 },
    { name: "Tartu", lon: 26.72, lat: 58.38, side: 1 },
    { name: "Oulu", lon: 25.47, lat: 65.01, side: 1 },
];
const STATS = [
    { value: "5", label: "living labs" },
    { value: "13", label: "partners" },
    { value: "6", label: "countries" },
];

//#endregion

//#region Drawing helpers

const poly = (ctx: CanvasRenderingContext2D, pts: Point[]) => {
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
};

/** Runs `draw` with the current alpha multiplied by `alpha`. */
const faded = (ctx: CanvasRenderingContext2D, alpha: number, draw: () => void) => {
    if (alpha <= 0.003) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    draw();
    ctx.restore();
};

/** A small quadcopter seen from above at an angle, lit in its colour. */
const drawDrone = (ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number, color = TEAL) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = "#dfe7ff";
    ctx.lineWidth = s * 0.14;
    ctx.lineCap = "round";
    const arms: [number, number][] = [[-1, -0.5], [1, -0.5], [1, 0.5], [-1, 0.5]];
    ctx.beginPath();
    for (const [dx, dy] of arms) {
        ctx.moveTo(0, 0);
        ctx.lineTo(dx * s, dy * s);
    }
    ctx.stroke();
    for (const [dx, dy] of arms) {
        ctx.fillStyle = "rgba(223,231,255,0.25)";
        ctx.beginPath();
        ctx.ellipse(dx * s, dy * s, s * 0.55, s * 0.27, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.8)";
        ctx.lineWidth = s * 0.07;
        ctx.beginPath();
        const a = t * 30 + dx * 2 + dy;
        ctx.moveTo(dx * s - Math.cos(a) * s * 0.5, dy * s - Math.sin(a) * s * 0.25);
        ctx.lineTo(dx * s + Math.cos(a) * s * 0.5, dy * s + Math.sin(a) * s * 0.25);
        ctx.stroke();
    }
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.48, s * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.04, s * 0.2, s * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
};

/** A coloured pill with dark text, centred on (x, y). */
const pill = (ctx: CanvasRenderingContext2D, label: string, x: number, y: number, size: number, color: string, k: number, alpha = 1) => {
    if (alpha <= 0.003) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.font = `700 ${size}px ${FONT}`;
    const w = ctx.measureText(label).width + size * 1.2;
    const h = size * 1.7;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y - h / 2, w, h, h / 2);
    ctx.fill();
    ctx.restore();
    text(ctx, label, x, y + k, size, { color: paperInk(), weight: 700, alpha });
};

const statusIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, state: "wait" | "ok" | "no", t: number, k: number) => {
    ctx.save();
    if (state === "wait") {
        ctx.strokeStyle = "rgba(0,0,0,0.15)";
        ctx.lineWidth = 3 * k;
        ctx.beginPath();
        ctx.arc(x, y, r * 0.8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = "#8a93ad";
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(x, y, r * 0.8, t * 6, t * 6 + 1.6);
        ctx.stroke();
    } else {
        ctx.fillStyle = state === "ok" ? "#2fbf7a" : RED;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 3 * k;
        ctx.lineCap = "round";
        ctx.beginPath();
        if (state === "ok") {
            ctx.moveTo(x - r * 0.45, y);
            ctx.lineTo(x - r * 0.1, y + r * 0.35);
            ctx.lineTo(x + r * 0.45, y - r * 0.35);
        } else {
            ctx.moveTo(x - r * 0.35, y - r * 0.35);
            ctx.lineTo(x + r * 0.35, y + r * 0.35);
            ctx.moveTo(x + r * 0.35, y - r * 0.35);
            ctx.lineTo(x - r * 0.35, y + r * 0.35);
        }
        ctx.stroke();
    }
    ctx.restore();
};

/** Ground, park, airfield and buildings. `scan` lights up the inspected building's facade. */
const drawCity = (ctx: CanvasRenderingContext2D, v: View, k: number, t: number, scan = 0) => {
    const cell = v.A / N;
    // ground
    const ground = [iso(v, 0, 0), iso(v, N, 0), iso(v, N, N), iso(v, 0, N)];
    glow(ctx, v.cx, v.y0 + v.A / 2, v.A * 1.1, "rgba(108,184,255,0.25)", 0.6);
    poly(ctx, ground);
    ctx.fillStyle = "#121c3d";
    ctx.fill();
    ctx.strokeStyle = "rgba(160,190,255,0.25)";
    ctx.lineWidth = 1.5 * k;
    ctx.stroke();
    ctx.strokeStyle = "rgba(160,190,255,0.08)";
    ctx.lineWidth = 1 * k;
    ctx.beginPath();
    for (let i = 1; i < N; i++) {
        const a = iso(v, i, 0);
        const b = iso(v, i, N);
        const c = iso(v, 0, i);
        const d = iso(v, N, i);
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.moveTo(c.x, c.y);
        ctx.lineTo(d.x, d.y);
    }
    ctx.stroke();

    // park
    poly(ctx, [iso(v, 3.08, 3.08), iso(v, 4.92, 3.08), iso(v, 4.92, 4.92), iso(v, 3.08, 4.92)]);
    ctx.fillStyle = "rgba(94,224,160,0.22)";
    ctx.fill();
    // airfield: a runway with a centre line
    poly(ctx, [iso(v, 0.2, 0.55), iso(v, 1.85, 0.55), iso(v, 1.85, 1.05), iso(v, 0.2, 1.05)]);
    ctx.fillStyle = "rgba(200,210,240,0.16)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.setLineDash([5 * k, 5 * k]);
    ctx.beginPath();
    const r0 = iso(v, 0.35, 0.8);
    const r1 = iso(v, 1.7, 0.8);
    ctx.moveTo(r0.x, r0.y);
    ctx.lineTo(r1.x, r1.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // trees in the park, back to front
    const trees: [number, number][] = [[3.4, 3.5], [4.5, 3.3], [3.3, 4.6], [4.6, 4.5], [3.9, 3.2], [3.2, 4.0], [4.7, 3.9]];
    for (const [u, w] of trees.sort((a, b) => a[0] + a[1] - b[0] - b[1])) {
        const p = iso(v, u, w, 0.18);
        ctx.fillStyle = "#2f9e6e";
        ctx.beginPath();
        ctx.arc(p.x, p.y, cell * 0.17, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.18)";
        ctx.beginPath();
        ctx.arc(p.x - cell * 0.05, p.y - cell * 0.05, cell * 0.07, 0, Math.PI * 2);
        ctx.fill();
    }

    // buildings, back to front
    for (const b of BUILDINGS) {
        const u0 = b.i + 0.14;
        const u1 = b.i + 0.86;
        const w0 = b.j + 0.14;
        const w1 = b.j + 0.86;
        const right = [iso(v, u1, w0), iso(v, u1, w1), iso(v, u1, w1, b.h), iso(v, u1, w0, b.h)];
        const left = [iso(v, u0, w1), iso(v, u1, w1), iso(v, u1, w1, b.h), iso(v, u0, w1, b.h)];
        const top = [iso(v, u0, w0, b.h), iso(v, u1, w0, b.h), iso(v, u1, w1, b.h), iso(v, u0, w1, b.h)];
        poly(ctx, right);
        ctx.fillStyle = "#1b264d";
        ctx.fill();
        poly(ctx, left);
        ctx.fillStyle = "#24336a";
        ctx.fill();
        poly(ctx, top);
        ctx.fillStyle = "#34488a";
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.12)";
        ctx.lineWidth = 1 * k;
        ctx.stroke();
        // windows on both visible faces
        const floors = Math.max(1, Math.floor(b.h / 0.38));
        for (let f = 0; f < floors; f++) {
            for (let c = 0; c < 2; c++) {
                const z = 0.2 + f * 0.38;
                if (z + 0.14 > b.h) continue;
                const along = 0.3 + c * 0.4;
                const litA = b.lit[(f * 2 + c) % 12] > 0.55;
                const litB = b.lit[(f * 2 + c + 5) % 12] > 0.6;
                const wa = lerp(w0, w1, along);
                ctx.fillStyle = litA ? "rgba(255,214,140,0.75)" : "rgba(255,255,255,0.08)";
                poly(ctx, [iso(v, u1, wa - 0.08, z), iso(v, u1, wa + 0.08, z), iso(v, u1, wa + 0.08, z + 0.14), iso(v, u1, wa - 0.08, z + 0.14)]);
                ctx.fill();
                const ua = lerp(u0, u1, along);
                ctx.fillStyle = litB ? "rgba(255,214,140,0.75)" : "rgba(255,255,255,0.08)";
                poly(ctx, [iso(v, ua - 0.08, w1, z), iso(v, ua + 0.08, w1, z), iso(v, ua + 0.08, w1, z + 0.14), iso(v, ua - 0.08, w1, z + 0.14)]);
                ctx.fill();
            }
        }
        // the drone base: a box on the roof
        if (b.i === 1 && b.j === 6) {
            poly(ctx, [iso(v, 1.3, 6.3, b.h), iso(v, 1.7, 6.3, b.h), iso(v, 1.7, 6.7, b.h), iso(v, 1.3, 6.7, b.h)]);
            ctx.strokeStyle = TEAL;
            ctx.lineWidth = 2 * k;
            ctx.stroke();
        }
        // the destination: a landing pad
        if (b.i === 6 && b.j === 1) {
            const p = iso(v, DEST.u, DEST.w, b.h);
            ctx.strokeStyle = "rgba(255,255,255,0.7)";
            ctx.lineWidth = 1.5 * k;
            ctx.beginPath();
            ctx.ellipse(p.x, p.y, cell * 0.4, cell * 0.2, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
        // the inspection: a bright line sweeping down the facade
        if (b.i === 5 && b.j === 1 && scan > 0 && scan < 1) {
            const z = b.h * (1 - scan);
            ctx.strokeStyle = BLUE;
            ctx.lineWidth = 3 * k;
            ctx.shadowColor = BLUE;
            ctx.shadowBlur = 12 * k;
            ctx.beginPath();
            const a = iso(v, u0, w1, z);
            const m = iso(v, u1, w1, z);
            const e = iso(v, u1, w0, z);
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(m.x, m.y);
            ctx.lineTo(e.x, e.y);
            ctx.stroke();
            ctx.shadowColor = "transparent";
        }
    }
    void t;
};

/** A drone above the city with its shadow on the ground. */
const droneInCity = (ctx: CanvasRenderingContext2D, v: View, k: number, t: number, p: { u: number; w: number; z: number }) => {
    const cell = v.A / N;
    const shadow = iso(v, p.u, p.w, 0);
    ctx.save();
    ctx.globalAlpha *= 0.35;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(shadow.x, shadow.y, cell * 0.4, cell * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    const d = iso(v, p.u, p.w, p.z);
    const bob = Math.sin(t * 3) * 2 * k;
    glow(ctx, d.x, d.y + bob, cell * 1.2, TEAL, 0.45);
    drawDrone(ctx, d.x, d.y + bob, Math.max(14 * k, cell * 0.38), t);
    return d;
};

//#endregion

const draw = ({ ctx, t, W, H, k, safe }: Frame) => {
    const span = safe.bottom - safe.top;
    void H;

    // the city's place on screen in each scene
    const v1: View = (() => {
        const A = Math.min(W * 0.25, span * 0.56);
        return { cx: W / 2, y0: safe.bottom - span * 0.03 - A, A };
    })();
    const v2: View = (() => {
        const A = Math.min(W * 0.2, span * 0.45);
        return { cx: W * 0.4, y0: safe.bottom - span * 0.03 - A, A };
    })();
    const v4: View = (() => {
        const A = Math.min(W * 0.22, span * 0.55);
        return { cx: W * 0.34, y0: safe.bottom - span * 0.04 - A, A };
    })();

    // Europe, needed early: the city shrinks into Eindhoven
    const mapS = (span * 0.9) / 35;
    const mapCx = W * 0.36;
    const geo = (lon: number, lat: number): Point => ({
        x: mapCx + (lon - 11) * COS * mapS,
        y: safe.top + span * 0.05 + (71 - lat) * mapS,
    });
    const eindhoven = geo(LABS[0].lon, LABS[0].lat);

    //#region the city: missions, then the layers of rules
    const cityIn = progress(t, T.missions, T.missions + 0.9);
    const cityOut = progress(t, T.code - 0.6, T.code);
    const cityA = cityIn * (1 - cityOut);
    if (cityA > 0.003) {
        const toLayers = ease(progress(t, T.layers, T.layers + 1.2));
        const v = lerpView(v1, v2, toLayers);
        const rise = (1 - easeOut(cityIn)) * 40 * k;
        const view = { ...v, y0: v.y0 + rise };
        faded(ctx, cityA, () => {
            const scan = progress(t, STOP_AT[2] - 0.15, STOP_AT[2] + 0.75);
            drawCity(ctx, view, k, t, scan);

            // stops: a pulse where something is delivered
            STOPS.forEach((s, i) => {
                const f = window01(t, STOP_AT[i] - 0.1, STOP_AT[i] + 1.4, 0.3) * (1 - toLayers);
                if (f <= 0 || i === 2) return;
                const p = iso(view, s.u, s.w, s.z);
                const cell = view.A / N;
                for (let r = 0; r < 2; r++) {
                    const phase = ((t - STOP_AT[i]) * 1.2 + r / 2) % 1;
                    faded(ctx, f * (1 - phase), () => {
                        ctx.strokeStyle = s.color;
                        ctx.lineWidth = 2.5 * k;
                        ctx.beginPath();
                        ctx.ellipse(p.x, p.y, cell * (0.2 + phase * 0.7), cell * (0.1 + phase * 0.35), 0, 0, Math.PI * 2);
                        ctx.stroke();
                    });
                }
                faded(ctx, f, () => {
                    ctx.fillStyle = s.color;
                    ctx.beginPath();
                    ctx.ellipse(p.x, p.y, cell * 0.18, cell * 0.09, 0, 0, Math.PI * 2);
                    ctx.fill();
                });
            });

            // the drone's planned route, ahead of it
            const routeA = window01(t, T.missions + 0.6, T.layers + 0.4, 0.4);
            if (routeA > 0) {
                faded(ctx, routeA * 0.6, () => {
                    ctx.strokeStyle = TEAL;
                    ctx.lineWidth = 2 * k;
                    ctx.setLineDash([6 * k, 7 * k]);
                    ctx.lineDashOffset = -t * 30 * k;
                    ctx.beginPath();
                    let first = true;
                    for (let s = Math.max(t, T.missions + 0.9); s <= T.missions + 4.5; s += 0.05) {
                        const q = flightAt(s);
                        const p = iso(view, q.u, q.w, q.z);
                        if (first) ctx.moveTo(p.x, p.y);
                        else ctx.lineTo(p.x, p.y);
                        first = false;
                    }
                    ctx.stroke();
                    ctx.setLineDash([]);
                    ctx.lineDashOffset = 0;
                });
            }

            const droneA = progress(t, T.missions + 0.2, T.missions + 0.6);
            let dronePos: Point | null = null;
            faded(ctx, droneA, () => {
                const q = flightAt(t);
                dronePos = droneInCity(ctx, view, k, t, q);
                // drop line while delivering
                STOPS.forEach((s, i) => {
                    const f = window01(t, STOP_AT[i] - 0.15, STOP_AT[i] + 0.35, 0.15);
                    if (f <= 0 || i === 2) return;
                    const a = iso(view, q.u, q.w, q.z);
                    const b = iso(view, s.u, s.w, s.z);
                    faded(ctx, f * 0.8, () => {
                        ctx.strokeStyle = s.color;
                        ctx.lineWidth = 2 * k;
                        ctx.setLineDash([4 * k, 4 * k]);
                        ctx.beginPath();
                        ctx.moveTo(a.x, a.y + 8 * k);
                        ctx.lineTo(b.x, b.y);
                        ctx.stroke();
                        ctx.setLineDash([]);
                    });
                });
            });

            //#region the three layers of rules, stacked over the city
            LAYERS.forEach((L, i) => {
                const order = LAYERS.length - 1 - i; // the region first, the EU last
                const appear = easeOut(progress(t, T.layers + 1.0 + order * 0.7, T.layers + 1.8 + order * 0.7));
                const a = appear * (1 - progress(t, T.code - 1.2, T.code - 0.6));
                if (a <= 0.003) return;
                const z = L.z + (1 - appear) * 1.6;
                const corners = [iso(view, 0, 0, z), iso(view, N, 0, z), iso(view, N, N, z), iso(view, 0, N, z)];
                faded(ctx, a, () => {
                    poly(ctx, corners);
                    ctx.fillStyle = L.color;
                    ctx.globalAlpha *= 0.1;
                    ctx.fill();
                    ctx.globalAlpha /= 0.1;
                    ctx.strokeStyle = L.color;
                    ctx.lineWidth = 2 * k;
                    ctx.stroke();
                    ctx.strokeStyle = L.color;
                    ctx.globalAlpha *= 0.2;
                    ctx.lineWidth = 1 * k;
                    ctx.beginPath();
                    for (let g = 2; g < N; g += 2) {
                        const p = iso(view, g, 0, z);
                        const q = iso(view, g, N, z);
                        const r = iso(view, 0, g, z);
                        const s = iso(view, N, g, z);
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(q.x, q.y);
                        ctx.moveTo(r.x, r.y);
                        ctx.lineTo(s.x, s.y);
                    }
                    ctx.stroke();
                    ctx.globalAlpha /= 0.2;
                    // label beside the plane's right corner
                    const c = corners[1];
                    const x = c.x + 26 * k;
                    const maxWidth = W - x - 30 * k;
                    ctx.fillStyle = L.color;
                    ctx.beginPath();
                    ctx.arc(c.x, c.y, 5 * k, 0, Math.PI * 2);
                    ctx.fill();
                    text(ctx, L.name, x, c.y - 15 * k, 26 * k, { align: "left", weight: 700, color: L.color, maxWidth });
                    text(ctx, L.rule, x, c.y + 17 * k, 20 * k, { align: "left", weight: 500, color: "rgba(255,255,255,0.8)", maxWidth });
                });
            });
            // all three apply to the same drone: a beam up through the planes
            const beam = window01(t, T.layers + 3.2, T.code - 0.6, 0.6);
            const pos = dronePos as Point | null;
            if (beam > 0 && pos) {
                const top = iso(view, 4, 4, LAYERS[0].z);
                faded(ctx, beam, () => {
                    const g = ctx.createLinearGradient(0, pos.y, 0, top.y);
                    g.addColorStop(0, "rgba(77,212,198,0.9)");
                    g.addColorStop(1, "rgba(108,184,255,0.2)");
                    ctx.strokeStyle = g;
                    ctx.lineWidth = 3 * k;
                    ctx.beginPath();
                    ctx.moveTo(pos.x, pos.y - 10 * k);
                    ctx.lineTo(top.x, lerp(pos.y, top.y, easeOut(progress(t, T.layers + 3.2, T.layers + 4))));
                    ctx.stroke();
                    LAYERS.forEach((L, i) => {
                        const f = progress(t, T.layers + 3.4 + (2 - i) * 0.2, T.layers + 3.8 + (2 - i) * 0.2);
                        if (f <= 0) return;
                        const p = iso(view, 4, 4, L.z);
                        const cell = view.A / N;
                        glow(ctx, p.x, p.y, cell * 1.4, L.color, 0.5 * f);
                        faded(ctx, f, () => {
                            ctx.strokeStyle = L.color;
                            ctx.lineWidth = 2.5 * k;
                            ctx.beginPath();
                            ctx.ellipse(p.x, p.y, cell * 0.55, cell * 0.28, 0, 0, Math.PI * 2);
                            ctx.stroke();
                        });
                    });
                });
            }
            //#endregion
        });

        // what the drones do, collected as they're done
        const chipsA = cityA * (1 - progress(t, T.layers + 0.4, T.layers + 1));
        if (chipsA > 0.003) {
            const size = 21 * k;
            ctx.font = `600 ${size}px ${FONT}`;
            const widths = STOPS.map((s) => ctx.measureText(s.label).width + 70 * k);
            const gap = 16 * k;
            const total = widths.reduce((a, b) => a + b, 0) + gap * (STOPS.length - 1);
            const scale = Math.min(1, (W * 0.92) / total);
            let x = W / 2 - (total * scale) / 2;
            const y = safe.top + span * 0.06;
            STOPS.forEach((s, i) => {
                const f = easeOut(progress(t, STOP_AT[i], STOP_AT[i] + 0.5));
                const w = widths[i] * scale;
                const h = 48 * k * scale;
                if (f > 0) {
                    faded(ctx, chipsA * f, () => {
                        const yy = y + (1 - f) * 16 * k;
                        ctx.fillStyle = paper();
                        ctx.beginPath();
                        ctx.roundRect(x, yy - h / 2, w, h, h / 2);
                        ctx.fill();
                        statusIcon(ctx, x + 26 * k * scale, yy, 12 * k * scale, "ok", t, k * scale);
                        ctx.fillStyle = s.color;
                        ctx.beginPath();
                        ctx.arc(x + 26 * k * scale, yy, 12 * k * scale, 0, Math.PI * 2);
                        ctx.fill();
                        text(ctx, s.label, x + 48 * k * scale, yy, size * scale, { align: "left", color: paperInk(), maxWidth: w - 60 * k * scale });
                    });
                }
                x += w + gap * scale;
            });
        }
    }
    //#endregion

    //#region legal text becomes a machine-readable rule
    const codeA = progress(t, T.code + 0.1, T.code + 0.7) * (1 - progress(t, T.fly - 0.5, T.fly));
    if (codeA > 0.003) {
        const cw = Math.min(W * 0.37, 640 * k);
        const ch = Math.min(span * 0.6, 360 * k);
        const cy = safe.top + span * 0.46;
        const lawX = W * 0.29;
        const codeX = W * 0.71;
        const slide = (1 - easeOut(progress(t, T.code + 0.1, T.code + 0.9))) * 40 * k;
        const pad = 30 * k;

        // legal text card
        const lawLeft = lawX - cw / 2 - slide;
        const lawTop = cy - ch / 2;
        faded(ctx, codeA, () => {
            ctx.save();
            ctx.shadowColor = "rgba(0,0,0,0.35)";
            ctx.shadowBlur = 24 * k;
            ctx.shadowOffsetY = 8 * k;
            ctx.fillStyle = paper();
            ctx.beginPath();
            ctx.roundRect(lawLeft, lawTop, cw, ch, 10 * k);
            ctx.fill();
            ctx.restore();
            text(ctx, "Example legal text", lawLeft + pad, lawTop + 34 * k, 17 * k, { align: "left", color: screenTheme.value === "light" ? "#948d7f" : "#6b7280", weight: 600, maxWidth: cw * 0.6 });

            // which language is showing
            const li = t < LANG_START ? 0 : Math.min(LAW.length - 1, 1 + Math.floor((t - LANG_START) / LANG_STEP));
            const since = t < LANG_START ? 1 : ((t - LANG_START) % LANG_STEP) / LANG_STEP;
            const swap = li === 0 ? 1 : Math.min(1, since * 4);
            const [lang, sentence] = LAW[li];
            pill(ctx, lang, lawLeft + cw - pad - 22 * k, lawTop + 34 * k, 16 * k, li === 0 ? "#e5e7eb" : ORANGE, k);
            pill(ctx, "EU", lawLeft + cw - pad - 72 * k, lawTop + 34 * k, 16 * k, GREEN, k, progress(t, T.code + 0.8, T.code + 1.2));

            // the sentence, wrapped to the card
            const fs = Math.min(34 * k, cw / 16);
            ctx.font = `500 ${fs}px Georgia, "Times New Roman", serif`;
            const space = ctx.measureText(" ").width;
            const words: { text: string; x: number; y: number; w: number }[] = [];
            let x = 0;
            let line = 0;
            for (const word of sentence.split(" ")) {
                const w = ctx.measureText(word).width;
                if (x > 0 && x + w > cw - pad * 2) {
                    x = 0;
                    line++;
                }
                words.push({ text: word, x, y: line, w });
                x += w + space;
            }
            const lineH = fs * 1.5;
            const textTop = lawTop + 92 * k + (1 - swap) * 8 * k;
            // highlight the words that become part of the rule
            TOKENS.forEach((tok, i) => {
                if (tok.word < 0 || li !== 0) return;
                const word = words[tok.word];
                if (!word) return;
                const f = window01(t, tokenAt(i) - 0.4, LANG_START, 0.3);
                faded(ctx, f * 0.35, () => {
                    ctx.fillStyle = tok.color;
                    ctx.fillRect(lawLeft + pad + word.x - 3 * k, textTop + word.y * lineH - fs * 0.62, (word.w + 6 * k) * easeOut(f), fs * 1.24);
                });
            });
            faded(ctx, swap, () => {
                ctx.fillStyle = screenTheme.value === "light" ? "#eee" : "#111";
                ctx.font = `500 ${fs}px Georgia, "Times New Roman", serif`;
                ctx.textAlign = "left";
                ctx.textBaseline = "middle";
                for (const w of words) ctx.fillText(w.text, lawLeft + pad + w.x, textTop + w.y * lineH);
            });
            // grey lines suggesting the rest of the article
            ctx.fillStyle = screenTheme.value === "light" ? "#1a1814" : "#e5e7eb";
            const restTop = textTop + (line + 1) * lineH + 6 * k;
            for (let r = 0; r < 4; r++) {
                const y = restTop + r * 22 * k;
                if (y > lawTop + ch - 24 * k) break;
                ctx.fillRect(lawLeft + pad, y, (cw - pad * 2) * (r === 3 ? 0.5 : 0.92 - r * 0.07), 8 * k);
            }

            // machine-readable card
            const codeLeft = codeX - cw / 2 + slide;
            ctx.save();
            ctx.shadowColor = "rgba(0,0,0,0.35)";
            ctx.shadowBlur = 24 * k;
            ctx.fillStyle = "#0f1530";
            ctx.beginPath();
            ctx.roundRect(codeLeft, lawTop, cw, ch, 10 * k);
            ctx.fill();
            ctx.restore();
            // pulses each time the language changes, to show the rule stays the same
            const pulse = t > LANG_START && t < LANG_START + LANG_STEP * (LAW.length - 1) ? 1 - since : 0;
            ctx.strokeStyle = pulse > 0 ? GREEN : "rgba(255,255,255,0.18)";
            ctx.lineWidth = (1.5 + pulse * 1.5) * k;
            ctx.beginPath();
            ctx.roundRect(codeLeft, lawTop, cw, ch, 10 * k);
            ctx.stroke();
            if (pulse > 0) glow(ctx, codeX, cy, cw * 0.6, "rgba(94,224,160,0.35)", pulse * 0.5);
            text(ctx, "Machine-readable rule", codeLeft + pad, lawTop + 34 * k, 17 * k, { align: "left", color: "rgba(255,255,255,0.55)", maxWidth: cw - pad * 2 });

            const mono = Math.min(25 * k, cw / 22);
            const codeLineH = Math.min(58 * k, (ch - 110 * k) / CODE.length);
            const keyW = cw * 0.36;
            CODE.forEach((c, i) => {
                const y = lawTop + 100 * k + i * codeLineH;
                const keyIn = progress(t, T.code + 1.0 + i * 0.12, T.code + 1.3 + i * 0.12);
                text(ctx, c.key, codeLeft + pad, y, mono, { align: "left", color: "#9fb6ff", font: MONO, weight: 500, alpha: keyIn });
                const tok = TOKENS.find((tk) => tk.line === i);
                const valueAt = tok ? tokenAt(TOKENS.indexOf(tok)) + 0.7 : T.code + 1.4;
                const typed = Math.floor(progress(t, valueAt, valueAt + 0.4) * c.value.length);
                if (typed > 0) {
                    text(ctx, c.value.slice(0, typed), codeLeft + pad + keyW, y, mono, {
                        align: "left",
                        color: c.color,
                        font: MONO,
                        weight: 600,
                        maxWidth: cw - pad * 2 - keyW,
                    });
                }
            });

            // words fly from the legal text to their line of the rule
            TOKENS.forEach((tok, i) => {
                const f = ease(progress(t, tokenAt(i), tokenAt(i) + 0.7));
                if (f <= 0 || f >= 1) return;
                const word = tok.word >= 0 ? words[tok.word] : null;
                const from = word
                    ? { x: lawLeft + pad + word.x + word.w / 2, y: textTop + word.y * lineH }
                    : { x: lawLeft + cw - pad - 72 * k, y: lawTop + 34 * k };
                const to = { x: codeLeft + pad + keyW + 50 * k, y: lawTop + 100 * k + tok.line * codeLineH };
                const p = { x: lerp(from.x, to.x, f), y: lerp(from.y, to.y, f) - Math.sin(f * Math.PI) * 70 * k };
                glow(ctx, p.x, p.y, 50 * k, tok.color, 0.6);
                pill(ctx, tok.label, p.x, p.y, 18 * k, tok.color, k);
            });

            // flow between the cards
            const flow = progress(t, T.code + 1.6, T.code + 2.2);
            if (flow > 0) {
                const x0 = lawLeft + cw + 12 * k;
                const x1 = codeLeft - 12 * k;
                faded(ctx, flow, () => {
                    for (let d = 0; d < 4; d++) {
                        const ph = (t * 0.9 + d / 4) % 1;
                        ctx.fillStyle = GREEN;
                        ctx.globalAlpha *= Math.sin(ph * Math.PI);
                        ctx.beginPath();
                        ctx.arc(lerp(x0, x1, ph), cy, 4 * k, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.globalAlpha /= Math.max(0.001, Math.sin(ph * Math.PI));
                    }
                });
            }

            // the same rule, whatever the language
            const badge = progress(t, LANG_START + 0.2, LANG_START + 0.6);
            pill(ctx, "Same rule in every language", codeX + slide, lawTop + ch + 44 * k, 19 * k, GREEN, k, badge);
        });
    }
    //#endregion

    //#region the drone checks the rules and plans its route
    const flyIn = progress(t, T.fly, T.fly + 0.8);
    const flyOut = progress(t, T.labs, T.labs + 1.1);
    const flyA = flyIn * (1 - progress(t, T.labs + 0.5, T.labs + 1.1));
    if (flyA > 0.003) {
        const shrink = ease(flyOut);
        const tiny: View = { cx: eindhoven.x, y0: eindhoven.y - 3 * k, A: 6 * k };
        const v = lerpView({ ...v4, y0: v4.y0 + (1 - easeOut(flyIn)) * 40 * k }, tiny, shrink);
        const cell = v.A / N;
        const zoneH = ZC * easeOut(progress(t, T.fly + 0.5, T.fly + 1.5));
        const checkAt = [T.fly + 2.3, T.fly + 2.65, T.fly + 3.0];
        const reroute = ease(progress(t, T.fly + 3.6, T.fly + 4.5));
        const okCity = t > T.fly + 4.7;
        const approved = t > T.fly + 4.9;
        const rejected = t > checkAt[2] && !okCity;
        const control = { u: lerp(4, 6.9, reroute), w: lerp(4, 6.9, reroute) };
        const route = (f: number) => ({
            u: (1 - f) * (1 - f) * DEPOT.u + 2 * (1 - f) * f * control.u + f * f * DEST.u,
            w: (1 - f) * (1 - f) * DEPOT.w + 2 * (1 - f) * f * control.w + f * f * DEST.w,
        });
        const cruise = 2.5;

        faded(ctx, flyA, () => {
            drawCity(ctx, v, k, t);

            // the airport zone: a cylinder over the airfield
            const zonesA = progress(t, T.fly + 0.4, T.fly + 1) * (1 - shrink);
            faded(ctx, zonesA, () => {
                const c0 = iso(v, 1, 1, 0);
                const c1 = iso(v, 1, 1, zoneH);
                const r = 1.15;
                const rx = r * cell * Math.SQRT2;
                const ry = rx / 2;
                ctx.fillStyle = ORANGE;
                ctx.globalAlpha *= 0.12;
                ctx.beginPath();
                ctx.ellipse(c0.x, c0.y, rx, ry, 0, 0, Math.PI);
                ctx.lineTo(c1.x - rx, c1.y);
                ctx.ellipse(c1.x, c1.y, rx, ry, 0, Math.PI, 0, true);
                ctx.closePath();
                ctx.fill();
                ctx.beginPath();
                ctx.ellipse(c1.x, c1.y, rx, ry, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha /= 0.12;
                ctx.strokeStyle = ORANGE;
                ctx.lineWidth = 2 * k;
                ctx.beginPath();
                ctx.ellipse(c1.x, c1.y, rx, ry, 0, 0, Math.PI * 2);
                ctx.moveTo(c0.x - rx, c0.y);
                ctx.lineTo(c1.x - rx, c1.y);
                ctx.moveTo(c0.x + rx, c0.y);
                ctx.lineTo(c1.x + rx, c1.y);
                ctx.stroke();
                ctx.setLineDash([5 * k, 5 * k]);
                ctx.beginPath();
                ctx.ellipse(c0.x, c0.y, rx, ry, 0, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
            });

            // the park zone: a prism over the park, flashing when the route crosses it
            const flash = rejected ? 0.5 + 0.5 * Math.sin(t * 10) : 0;
            faded(ctx, zonesA, () => {
                const corners: [number, number][] = [[3, 3], [5, 3], [5, 5], [3, 5]];
                const bottom = corners.map(([u, w]) => iso(v, u, w, 0));
                const top = corners.map(([u, w]) => iso(v, u, w, zoneH));
                const color = PINK;
                ctx.fillStyle = color;
                ctx.globalAlpha *= 0.1 + flash * 0.15;
                // the two front walls and the top
                poly(ctx, [bottom[1], bottom[2], top[2], top[1]]);
                ctx.fill();
                poly(ctx, [bottom[2], bottom[3], top[3], top[2]]);
                ctx.fill();
                poly(ctx, top);
                ctx.fill();
                ctx.globalAlpha /= 0.1 + flash * 0.15;
                ctx.strokeStyle = color;
                ctx.lineWidth = (2 + flash * 1.5) * k;
                poly(ctx, top);
                ctx.stroke();
                ctx.beginPath();
                for (let i = 0; i < 4; i++) {
                    ctx.moveTo(bottom[i].x, bottom[i].y);
                    ctx.lineTo(top[i].x, top[i].y);
                }
                ctx.stroke();
            });

            // the altitude ceiling
            const ceilA = progress(t, T.fly + 1.0, T.fly + 1.6) * (1 - shrink);
            faded(ctx, ceilA, () => {
                const corners = [iso(v, 0, 0, ZC), iso(v, N, 0, ZC), iso(v, N, N, ZC), iso(v, 0, N, ZC)];
                poly(ctx, corners);
                ctx.fillStyle = BLUE;
                ctx.globalAlpha *= 0.05;
                ctx.fill();
                ctx.globalAlpha /= 0.05;
                ctx.strokeStyle = BLUE;
                ctx.lineWidth = 1.5 * k;
                ctx.setLineDash([10 * k, 7 * k]);
                ctx.stroke();
                ctx.setLineDash([]);
            });

            // zone labels, clear of each other
            const labelA = progress(t, T.fly + 1.3, T.fly + 1.8) * (1 - progress(t, T.labs - 0.4, T.labs));
            const airLabel = iso(v, 1, 1, ZC);
            pill(ctx, "Airport zone", airLabel.x, airLabel.y - 2.2 * cell * 0.5 - 6 * k, 15 * k, ORANGE, k, labelA);
            const parkLabel = iso(v, 4, 4, ZC);
            pill(ctx, "City park", parkLabel.x, parkLabel.y, 15 * k, PINK, k, labelA);
            const ceil = iso(v, 0, N, ZC);
            pill(ctx, "120 m", ceil.x - 34 * k, ceil.y, 15 * k, BLUE, k, labelA);

            // the route: in the air, and its shadow on the ground
            const routeA = progress(t, T.fly + 1.7, T.fly + 2.2) * (1 - progress(t, T.labs - 0.4, T.labs));
            if (routeA > 0) {
                const drawn = easeOut(progress(t, T.fly + 1.7, T.fly + 2.3));
                const color = okCity ? GREEN : rejected ? RED : "#ffffff";
                const steps = 48;
                faded(ctx, routeA, () => {
                    ctx.strokeStyle = "rgba(255,255,255,0.25)";
                    ctx.lineWidth = 1.5 * k;
                    ctx.setLineDash([3 * k, 6 * k]);
                    ctx.beginPath();
                    for (let s = 0; s <= steps * drawn; s++) {
                        const q = route(s / steps);
                        const p = iso(v, q.u, q.w, 0);
                        if (s === 0) ctx.moveTo(p.x, p.y);
                        else ctx.lineTo(p.x, p.y);
                    }
                    ctx.stroke();
                    ctx.strokeStyle = color;
                    ctx.lineWidth = 3 * k;
                    ctx.setLineDash([10 * k, 7 * k]);
                    ctx.lineDashOffset = -t * 40 * k;
                    ctx.beginPath();
                    for (let s = 0; s <= steps * drawn; s++) {
                        const f = s / steps;
                        const q = route(f);
                        const z = lerp(DEPOT.z, cruise, Math.min(1, f * 6)) * (f < 0.85 ? 1 : 1) - (f > 0.88 ? (cruise - DEST.z) * ((f - 0.88) / 0.12) : 0);
                        const p = iso(v, q.u, q.w, z);
                        if (s === 0) ctx.moveTo(p.x, p.y);
                        else ctx.lineTo(p.x, p.y);
                    }
                    ctx.stroke();
                    ctx.setLineDash([]);
                    ctx.lineDashOffset = 0;
                });
                if (rejected) {
                    const p = iso(v, 4, 4, cruise);
                    glow(ctx, p.x, p.y, 40 * k, RED, 0.6);
                    statusIcon(ctx, p.x, p.y, 14 * k, "no", t, k);
                }
            }

            // the drone: waits on its base, then flies the approved route
            const go = progress(t, T.fly + 5.0, T.fly + 6.8);
            const f = ease(go);
            const q = route(f);
            const lift = progress(t, T.fly + 4.9, T.fly + 5.3);
            const z = go < 0.12 ? lerp(DEPOT.z, cruise, Math.max(lift, go / 0.12)) : go > 0.88 ? lerp(cruise, DEST.z, (go - 0.88) / 0.12) : cruise;
            faded(ctx, 1 - shrink, () => {
                droneInCity(ctx, v, k, t, { u: q.u, w: q.w, z });
                if (go >= 1) {
                    const p = iso(v, DEST.u, DEST.w, DEST.z);
                    const land = progress(t, T.fly + 6.8, T.fly + 7.1);
                    glow(ctx, p.x, p.y, 50 * k, GREEN, land * 0.6);
                }
            });
        });

        // the rule check, as the drone sees it
        const hudA = progress(t, T.fly + 1.4, T.fly + 2.0) * (1 - progress(t, T.labs - 0.5, T.labs));
        if (hudA > 0.003) {
            const hw = Math.min(W * 0.34, 600 * k);
            const left = W * 0.6;
            const rowH = 66 * k;
            const head = 64 * k;
            const hh = head + rowH * LAYERS.length + 20 * k;
            const top = safe.top + span * 0.42 - hh / 2 + (1 - easeOut(hudA)) * 20 * k;
            faded(ctx, hudA, () => {
                ctx.save();
                ctx.shadowColor = "rgba(0,0,0,0.35)";
                ctx.shadowBlur = 24 * k;
                ctx.shadowOffsetY = 8 * k;
                ctx.fillStyle = paper();
                ctx.beginPath();
                ctx.roundRect(left, top, hw, hh, 10 * k);
                ctx.fill();
                ctx.restore();
                text(ctx, "Rule check before take-off", left + 28 * k, top + head / 2 + 4 * k, 21 * k, { align: "left", color: paperInk(), weight: 700, maxWidth: hw - 56 * k });
                ctx.fillStyle = screenTheme.value === "light" ? "#1a1814" : "#e5e7eb";
                ctx.fillRect(left + 28 * k, top + head, hw - 56 * k, 1.5 * k);
                LAYERS.forEach((L, i) => {
                    const y = top + head + rowH * (i + 0.5) + 6 * k;
                    const tagW = 112 * k;
                    ctx.fillStyle = L.color;
                    ctx.beginPath();
                    ctx.roundRect(left + 28 * k, y - 15 * k, tagW, 30 * k, 15 * k);
                    ctx.fill();
                    text(ctx, L.tag, left + 28 * k + tagW / 2, y + 1 * k, 16 * k, { color: paperInk(), weight: 700, maxWidth: tagW - 16 * k });
                    text(ctx, L.short, left + 28 * k + tagW + 18 * k, y, 20 * k, {
                        align: "left",
                        color: screenTheme.value === "light" ? "#e0d6c8" : "#1f2937",
                        weight: 500,
                        maxWidth: hw - tagW - 28 * k - 18 * k - 70 * k,
                    });
                    const state = t < checkAt[i] ? "wait" : i === 2 && !okCity ? "no" : "ok";
                    const pop = state === "wait" ? 1 : 1 + 0.25 * Math.sin(progress(t, i === 2 && okCity ? T.fly + 4.7 : checkAt[i], (i === 2 && okCity ? T.fly + 4.7 : checkAt[i]) + 0.3) * Math.PI);
                    statusIcon(ctx, left + hw - 44 * k, y, 15 * k * pop, state, t, k);
                });
            });
            // the verdict, below the card
            const verdictA = hudA * progress(t, checkAt[2], checkAt[2] + 0.3);
            const label = approved ? "Route approved" : okCity ? "Re-checking" : rejected ? "Route rejected, re-planning" : "";
            const color = approved ? GREEN : rejected ? RED : "#e5e7eb";
            if (label) pill(ctx, label, left + hw / 2, top + hh + 40 * k, 19 * k, color, k, verdictA);
        }
    }
    //#endregion

    //#region five living labs across Europe
    const mapA = progress(t, T.labs + 0.4, T.labs + 1.2) * (1 - progress(t, T.outro, T.outro + 1) * 0.85);
    if (mapA > 0.003) {
        faded(ctx, mapA, () => {
            // the dots appear in a wave from Eindhoven
            const reach = (t - T.labs - 0.4) * span * 0.9;
            ctx.fillStyle = "#9fb6ff";
            for (const d of DOTS) {
                const p = geo(d.lon, d.lat);
                const dist = Math.hypot(p.x - eindhoven.x, p.y - eindhoven.y);
                const f = progress(reach - dist, 0, 60 * k);
                if (f <= 0) continue;
                ctx.globalAlpha = mapA * 0.42 * f;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 2.6 * k, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = mapA;

            // links from Eindhoven to the other labs
            LABS.slice(1).forEach((lab, i) => {
                const start = T.labs + 1.4 + i * 0.35;
                const f = easeOut(progress(t, start, start + 0.8));
                if (f <= 0) return;
                const b = geo(lab.lon, lab.lat);
                const mid = { x: (eindhoven.x + b.x) / 2, y: (eindhoven.y + b.y) / 2 - Math.hypot(b.x - eindhoven.x, b.y - eindhoven.y) * 0.25 };
                const at = (s: number) => ({
                    x: (1 - s) * (1 - s) * eindhoven.x + 2 * (1 - s) * s * mid.x + s * s * b.x,
                    y: (1 - s) * (1 - s) * eindhoven.y + 2 * (1 - s) * s * mid.y + s * s * b.y,
                });
                ctx.strokeStyle = TEAL;
                ctx.globalAlpha = mapA * 0.6;
                ctx.lineWidth = 2 * k;
                ctx.beginPath();
                for (let s = 0; s <= 30 * f; s++) {
                    const p = at(s / 30);
                    if (s === 0) ctx.moveTo(p.x, p.y);
                    else ctx.lineTo(p.x, p.y);
                }
                ctx.stroke();
                ctx.globalAlpha = mapA;
                // a drone travelling along each link, after it is drawn
                if (f >= 1) {
                    const s = ((t - start - 0.8) * 0.35 + i * 0.2) % 1;
                    const p = at(s);
                    glow(ctx, p.x, p.y, 22 * k, TEAL, 0.6);
                    drawDrone(ctx, p.x, p.y, 7 * k, t);
                }
            });

            LABS.forEach((lab, i) => {
                const start = i === 0 ? T.labs + 0.9 : T.labs + 2.0 + (i - 1) * 0.35;
                const f = easeOut(progress(t, start, start + 0.5));
                if (f <= 0) return;
                const p = geo(lab.lon, lab.lat);
                const phase = (t * 0.6 + i * 0.2) % 1;
                faded(ctx, f * (1 - phase), () => {
                    ctx.strokeStyle = TEAL;
                    ctx.lineWidth = 2 * k;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, (8 + phase * 26) * k, 0, Math.PI * 2);
                    ctx.stroke();
                });
                glow(ctx, p.x, p.y, 34 * k, TEAL, 0.5 * f);
                faded(ctx, f, () => {
                    ctx.fillStyle = "#fff";
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, 7 * k * (0.6 + 0.4 * f), 0, Math.PI * 2);
                    ctx.fill();
                });
                text(ctx, lab.name, p.x + lab.side * 18 * k, p.y, 22 * k, { align: lab.side < 0 ? "right" : "left", weight: 700, alpha: f });
            });

            // the project in numbers
            const cardW = Math.min(W * 0.26, 400 * k);
            const cardH = 92 * k;
            const gap = 18 * k;
            const left = Math.max(W * 0.62, mapCx + 22 * COS * mapS + 40 * k);
            const total = STATS.length * cardH + (STATS.length - 1) * gap;
            const top0 = safe.top + span * 0.5 - total / 2 + 20 * k;
            text(ctx, "Flying Forward 2020, funded by EU Horizon 2020", left, top0 - 34 * k, 19 * k, {
                align: "left",
                weight: 500,
                color: "rgba(255,255,255,0.7)",
                maxWidth: Math.min(cardW * 1.3, W - left - 24 * k),
                alpha: progress(t, T.labs + 2.6, T.labs + 3.2),
            });
            STATS.forEach((s, i) => {
                const f = easeOut(progress(t, T.labs + 2.8 + i * 0.25, T.labs + 3.4 + i * 0.25));
                if (f <= 0) return;
                const y = top0 + i * (cardH + gap) + (1 - f) * 24 * k;
                faded(ctx, f, () => {
                    ctx.fillStyle = paper();
                    ctx.beginPath();
                    ctx.roundRect(left, y, Math.min(cardW, W - left - 24 * k), cardH, 10 * k);
                    ctx.fill();
                    text(ctx, s.value, left + 28 * k, y + cardH / 2, 44 * k, { align: "left", weight: 800, color: paperInk() });
                    text(ctx, s.label, left + 100 * k, y + cardH / 2 + 2 * k, 24 * k, {
                        align: "left",
                        weight: 600,
                        color: paperMuted(),
                        maxWidth: Math.min(cardW, W - left - 24 * k) - 124 * k,
                    });
                });
            });
        });
    }
    //#endregion
};

const updateDom = (t: number) => {
    const next = sceneAt<Scene>(t, [
        ["intro", 0],
        ["missions", T.missions],
        ["layers", T.layers],
        ["code", T.code],
        ["fly", T.fly],
        ["labs", T.labs],
        ["outro", T.outro],
        ["credits", T.credits],
    ]);
    if (scene.value !== next) scene.value = next;
};

useCanvasTimeline(canvas, T.end, draw, { tick: updateDom, done: () => emit("done") });
</script>
