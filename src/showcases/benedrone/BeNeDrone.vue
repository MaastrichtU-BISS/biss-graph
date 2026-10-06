<template>
    <ShowcaseStage ref="stage" :scene="scene" :captions="captions"
        eyebrow="A BISS project funded by Interreg Flanders-Netherlands" title="BeNeDrone"
        tagline="Medical drones across the Dutch-Belgian border"
        outro="Preparing the Southern Netherlands and Flanders for responsible, cross-border medical drones."
        url="interregvlaned.eu/benedrone"
        :partners="['Maastricht University', 'Maastricht UMC+', 'KU Leuven', 'Dutch Drone Centre Aviolanda']"
        :funders="['Interreg Flanders–Netherlands (ERDF)']" :members="members" />
</template>
<script setup lang="ts">
import { computed, ref } from "vue";
import { theme as screenTheme } from "../../i18n";
import ShowcaseStage from "../shared/ShowcaseStage.vue";
import { ease, easeOut, Frame, glow, lerp, mulberry32, progress, sceneAt, text, useCanvasTimeline, window01 } from "../shared/anim";

defineProps<{ members: { photo?: string; title: string }[] }>();
const emit = defineEmits<{ done: [] }>();

// The same physical corridor carries the story until the view expands to the region.
const T = { emergency: 3.5, road: 9, drone: 15.5, cargo: 22, rules: 28.5, scale: 36, outro: 43, credits: 49, end: 55 };
type Scene = "intro" | "emergency" | "road" | "drone" | "cargo" | "rules" | "scale" | "outro" | "credits";
const captions: Record<string, string> = {
    emergency: "An emergency, just across the border.",
    road: "By road, help has to wind its way there. Every minute counts.",
    drone: "A medical drone can take a direct route across the border.",
    cargo: "Carrying what saves lives: defibrillators, blood, even organs.",
    rules: "A flight needs more than a route: legal, logistical and societal checks matter too.",
    scale: "BeNeDrone is building a model that other border regions can use.",
};
const stage = ref<InstanceType<typeof ShowcaseStage>>();
const canvas = computed(() => stage.value?.canvas);
const scene = ref<Scene>("intro");

const BLUE = "#6cb8ff", TEAL = "#4dd4c6", RED = "#ff5964", AMBER = "#ffbf69", MINT = "#6ee7b7";
type GridPoint = { u: number; v: number; z?: number };
type Point = { x: number; y: number };
type View = { at: (u: number, v: number, z?: number) => Point; s: number; unit: number; mobile: boolean };
const HOSPITAL: GridPoint = { u: 2.1, v: 6.4 };
const PATIENT: GridPoint = { u: 8.2, v: 3.0 };
const ROAD: GridPoint[] = [HOSPITAL, { u: 2.4, v: 5.3 }, { u: 3.4, v: 4.9 },
    { u: 3.9, v: 4.1 }, { u: 5.1, v: 4.3 }, { u: 5.8, v: 3.5 }, { u: 7.2, v: 3.8 }, PATIENT];
const FLIGHT: GridPoint[] = [{ ...HOSPITAL, z: 0.3 }, { u: 2.5, v: 6.1, z: 2.1 },
    { u: 4.7, v: 5.1, z: 2.35 }, { u: 6.3, v: 4.0, z: 2.25 },
    { u: 7.8, v: 3.3, z: 1.6 }, { ...PATIENT, z: 0.4 }];

const buildings = (() => {
    const random = mulberry32(203);
    const result: { u: number; v: number; h: number; lit: boolean[] }[] = [];
    for (let u = 0; u < 10; u++) for (let v = 0; v < 10; v++) {
        if ([HOSPITAL, PATIENT, ...ROAD].some((p) => Math.hypot(p.u - u - 0.5, p.v - v - 0.5) < 1.25)) continue;
        if (random() < 0.28) continue;
        result.push({ u: u + 0.12, v: v + 0.12, h: 0.45 + random() * 1.15,
            lit: Array.from({ length: 4 }, () => random() > 0.48) });
    }
    return result.sort((a, b) => a.u + a.v - b.u - b.v);
})();

const view = ({ W, safe, k }: Frame): View => {
    const span = safe.bottom - safe.top;
    const mobile = W < 600;
    const s = Math.min(W / (mobile ? 22 : 21), span / 10.8);
    const top = safe.top + span * (mobile ? 0.23 : 0.08);
    return { at: (u, v, z = 0) => ({ x: W / 2 + (u - v) * s, y: top + (u + v) * s * 0.5 - z * s }),
        s, mobile, unit: Math.max(k, mobile ? 0.45 : 0) };
};
const shape = (ctx: CanvasRenderingContext2D, points: Point[]) => {
    ctx.beginPath(); points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath();
};
const faded = (ctx: CanvasRenderingContext2D, alpha: number, fn: () => void) => {
    if (alpha <= 0.002) return;
    ctx.save(); ctx.globalAlpha *= alpha; fn(); ctx.restore();
};
const along = (path: GridPoint[], fraction: number): GridPoint => {
    const lengths = path.slice(1).map((p, i) => Math.hypot(p.u - path[i].u, p.v - path[i].v));
    let d = Math.max(0, Math.min(1, fraction)) * lengths.reduce((a, b) => a + b, 0);
    for (let i = 0; i < lengths.length; i++) {
        if (d <= lengths[i]) {
            const q = d / lengths[i];
            return { u: lerp(path[i].u, path[i + 1].u, q), v: lerp(path[i].v, path[i + 1].v, q),
                z: lerp(path[i].z ?? 0, path[i + 1].z ?? 0, q) };
        }
        d -= lengths[i];
    }
    return path[path.length - 1];
};
const drawRoute = (ctx: CanvasRenderingContext2D, v: View, path: GridPoint[], fraction: number) => {
    ctx.beginPath();
    for (let i = 0; i <= Math.ceil(80 * fraction); i++) {
        const p = along(path, Math.min(fraction, i / 80));
        const q = v.at(p.u, p.v, p.z);
        i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y);
    }
};
const cross = (ctx: CanvasRenderingContext2D, x: number, y: number, s: number) => {
    ctx.fillRect(x - s * 0.13, y - s * 0.55, s * 0.26, s * 1.1);
    ctx.fillRect(x - s * 0.55, y - s * 0.13, s * 1.1, s * 0.26);
};
const drone = (ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number, alpha = 1) => {
    faded(ctx, alpha, () => {
        glow(ctx, x, y, s * 5, TEAL, 0.55);
        ctx.translate(x, y);
        ctx.lineCap = "round"; ctx.lineWidth = s * 0.15; ctx.strokeStyle = "#eafaff";
        ctx.beginPath(); ctx.moveTo(-s, -s * 0.55); ctx.lineTo(s, s * 0.55);
        ctx.moveTo(-s, s * 0.55); ctx.lineTo(s, -s * 0.55); ctx.stroke();
        for (const [dx, dy] of [[-1, -0.55], [1, -0.55], [-1, 0.55], [1, 0.55]]) {
            ctx.strokeStyle = "rgba(180,242,255,0.78)"; ctx.lineWidth = s * 0.08;
            ctx.beginPath(); ctx.ellipse(dx * s, dy * s, s * 0.45,
                s * (0.14 + 0.09 * Math.abs(Math.sin(t * 42 + dx))), 0, 0, Math.PI * 2); ctx.stroke();
            ctx.fillStyle = TEAL; ctx.beginPath(); ctx.arc(dx * s, dy * s, s * 0.18, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = screenTheme.value === "light" ? "#0d1523" : "#f2fbff";
        ctx.beginPath(); ctx.roundRect(-s * 0.42, -s * 0.32, s * 0.84, s * 0.64, s * 0.16); ctx.fill();
        ctx.fillStyle = RED; cross(ctx, 0, 0, s * 0.44);
    });
};
const building = (ctx: CanvasRenderingContext2D, v: View, b: (typeof buildings)[number]) => {
    const { at, s } = v;
    const a = at(b.u, b.v), c = at(b.u + 0.72, b.v), d = at(b.u + 0.72, b.v + 0.72), e = at(b.u, b.v + 0.72);
    const h = b.h * s;
    shape(ctx, [e, d, { x: d.x, y: d.y - h }, { x: e.x, y: e.y - h }]); ctx.fillStyle = "#17284b"; ctx.fill();
    shape(ctx, [c, d, { x: d.x, y: d.y - h }, { x: c.x, y: c.y - h }]); ctx.fillStyle = "#20365c"; ctx.fill();
    shape(ctx, [a, c, d, e].map((p) => ({ x: p.x, y: p.y - h })));
    ctx.fillStyle = b.u < 5 ? "#304465" : "#2b4062"; ctx.fill();
    ctx.strokeStyle = "rgba(145,189,235,0.22)"; ctx.lineWidth = Math.max(0.5, s * 0.018); ctx.stroke();
    b.lit.forEach((lit, i) => {
        if (!lit) return;
        const base = i % 2 ? c : e;
        const end = d;
        const x = lerp(base.x, end.x, i < 2 ? 0.3 : 0.7), y = lerp(base.y, end.y, i < 2 ? 0.3 : 0.7) - h * 0.42;
        ctx.fillStyle = i === 3 ? "rgba(255,194,110,0.75)" : "rgba(144,199,255,0.6)";
        ctx.fillRect(x, y, Math.max(1, s * 0.07), Math.max(1, s * 0.11));
    });
};

const world = (f: Frame, v: View, t: number, alpha: number) => {
    const { ctx, W, safe } = f, { at, s, unit, mobile } = v;
    faded(ctx, alpha, () => {
        // Isometric streets and buildings make the route feel like a real place.
        for (let sum = 0; sum <= 18; sum++) for (let u = 0; u < 10; u++) {
            const w = sum - u; if (w < 0 || w >= 10) continue;
            shape(ctx, [at(u, w), at(u + 1, w), at(u + 1, w + 1), at(u, w + 1)]);
            ctx.fillStyle = u < 5 ? (sum % 2 ? "#111e3b" : "#142343") : (sum % 2 ? "#101e38" : "#13233f");
            ctx.fill(); ctx.strokeStyle = "rgba(130,175,225,0.12)";
            ctx.lineWidth = Math.max(0.6, s * 0.012); ctx.stroke();
        }
        ctx.beginPath();
        for (let i = 0; i <= 30; i++) {
            const p = at(5.04 + Math.sin(i * 0.42) * 0.06, i / 3);
            i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
        }
        ctx.strokeStyle = "rgba(255,191,105,0.16)"; ctx.lineWidth = s * 0.32; ctx.stroke();
        ctx.strokeStyle = AMBER; ctx.lineWidth = Math.max(1.5, s * 0.035);
        ctx.setLineDash([s * 0.2, s * 0.13]); ctx.stroke(); ctx.setLineDash([]);
        faded(ctx, 1 - progress(t, T.rules, T.rules + 1.2) * 0.5, () => buildings.forEach((b) => building(ctx, v, b)));

        const h = at(HOSPITAL.u, HOSPITAL.v, 0.4), p = at(PATIENT.u, PATIENT.v);
        glow(ctx, h.x, h.y, 90 * unit, BLUE, 0.34);
        ctx.fillStyle = screenTheme.value === "light" ? "#0d1523" : "#eaf7ff"; ctx.beginPath();
        ctx.roundRect(h.x - 24 * unit, h.y - 22 * unit, 48 * unit, 44 * unit, 8 * unit); ctx.fill();
        text(ctx, "H", h.x, h.y + 2 * unit, 31 * unit,
            { color: screenTheme.value === "light" ? "#f3f8ff" : "#0c1633", weight: 800 });
        for (let i = 0; i < 3; i++) {
            const phase = (t * 0.38 + i / 3) % 1;
            ctx.strokeStyle = `rgba(255,89,100,${(1 - phase) * 0.7})`;
            ctx.lineWidth = 2.5 * unit; ctx.beginPath();
            ctx.arc(p.x, p.y, (16 + phase * 65) * unit, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(p.x, p.y, 17 * unit, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = screenTheme.value === "light" ? "#111" : "#fff";
        cross(ctx, p.x, p.y, 17 * unit);
        const appear = progress(t, T.emergency + 0.3, T.emergency + 1.2);
        text(ctx, "MAASTRICHT · NL", Math.max(12, h.x), h.y - 54 * unit,
            Math.max(11, 17 * unit), { color: "#dce9ff", weight: 700, alpha: appear, align: mobile ? "left" : "center" });
        text(ctx, "FLANDERS · BE", Math.min(W - 12, p.x), p.y - 47 * unit,
            Math.max(11, 17 * unit), { color: "#dce9ff", weight: 700, alpha: appear, align: mobile ? "right" : "center" });
        text(ctx, "ONE REGION. TWO COUNTRIES.", W / 2, safe.top + 25 * unit,
            Math.max(11, 19 * unit), { color: AMBER, weight: 800, alpha: appear });
    });
};

const road = (f: Frame, v: View, t: number, alpha: number) => {
    const { ctx, W, safe } = f, { at, unit } = v;
    const reveal = ease(progress(t, T.road, T.road + 2.4));
    faded(ctx, alpha * reveal, () => {
        ctx.lineCap = "round"; ctx.lineJoin = "round";
        drawRoute(ctx, v, ROAD, reveal); ctx.strokeStyle = "rgba(255,191,105,0.2)";
        ctx.lineWidth = 18 * unit; ctx.stroke();
        drawRoute(ctx, v, ROAD, reveal); ctx.strokeStyle = AMBER; ctx.lineWidth = 3.5 * unit; ctx.stroke();
        const q = along(ROAD, easeOut(progress(t, T.road + 0.7, T.drone + 4)) * 0.67);
        const car = at(q.u, q.v);
        glow(ctx, car.x, car.y, 42 * unit, AMBER, 0.55);
        ctx.fillStyle = "#f7fbff"; ctx.beginPath();
        ctx.roundRect(car.x - 17 * unit, car.y - 9 * unit, 34 * unit, 18 * unit, 5 * unit); ctx.fill();
        ctx.fillStyle = RED; cross(ctx, car.x, car.y, 9 * unit);
        text(ctx, "ROAD ROUTE", W / 2, safe.top + 54 * unit, Math.max(13, 24 * unit),
            { color: AMBER, weight: 800, alpha: window01(t, T.road + 0.5, T.drone + 0.5, 0.5) });
    });
};

const flight = (f: Frame, v: View, t: number, alpha: number) => {
    const { ctx, W, safe } = f, { at, unit } = v;
    const reveal = ease(progress(t, T.drone + 0.2, T.drone + 3.6));
    faded(ctx, alpha * reveal, () => {
        drawRoute(ctx, v, FLIGHT, reveal); ctx.strokeStyle = "rgba(77,212,198,0.17)";
        ctx.lineWidth = 25 * unit; ctx.stroke();
        drawRoute(ctx, v, FLIGHT, reveal); ctx.strokeStyle = TEAL; ctx.lineWidth = 4 * unit;
        ctx.setLineDash([13 * unit, 8 * unit]); ctx.lineDashOffset = -t * 24 * unit; ctx.stroke();
        ctx.setLineDash([]); ctx.lineDashOffset = 0;
        const q = along(FLIGHT, reveal), d = at(q.u, q.v, q.z);
        drone(ctx, d.x, d.y - Math.sin(t * 5) * 3 * unit, 17 * unit, t);
        if (reveal > 0.9) {
            const p = at(PATIENT.u, PATIENT.v);
            glow(ctx, p.x, p.y, 90 * unit, TEAL, 0.5);
            ctx.strokeStyle = TEAL; ctx.lineWidth = 3 * unit;
            ctx.beginPath(); ctx.arc(p.x, p.y, 25 * unit + Math.sin(t * 4) * 3 * unit, 0, Math.PI * 2); ctx.stroke();
        }
        text(ctx, "DIRECT FLIGHT", W / 2, safe.top + 54 * unit, Math.max(13, 24 * unit),
            { color: TEAL, weight: 800, alpha: window01(t, T.drone + 0.4, T.cargo + 0.3, 0.5) });
    });
};

const payloads = [
    { title: "DEFIBRILLATOR", symbol: "AED", color: MINT },
    { title: "BLOOD", symbol: "O+", color: RED },
    { title: "DONOR ORGAN", symbol: "+", color: BLUE },
];
const cargo = (f: Frame, v: View, t: number, alpha: number) => {
    const { ctx, W, safe } = f, { unit, mobile } = v, span = safe.bottom - safe.top;
    faded(ctx, alpha, () => {
        const centre = { x: W / 2, y: safe.top + span * (mobile ? 0.2 : 0.18) };
        drone(ctx, centre.x, centre.y + Math.sin(t * 4) * 4 * unit, 24 * unit, t);
        payloads.forEach((item, i) => {
            const enter = easeOut(progress(t, T.cargo + i * 0.65, T.cargo + i * 0.65 + 0.8));
            faded(ctx, enter, () => {
                const x = mobile ? W / 2 : W * (0.24 + i * 0.26);
                const y = mobile ? safe.top + span * (0.37 + i * 0.17) : safe.top + span * 0.56;
                const r = (mobile ? 24 : 39) * unit;
                ctx.strokeStyle = item.color;
                ctx.lineWidth = 1.5 * unit;
                ctx.globalAlpha *= 0.62;
                ctx.beginPath(); ctx.moveTo(centre.x, centre.y + 19 * unit);
                ctx.lineTo(x, y - r - 14 * unit); ctx.stroke();
                ctx.globalAlpha /= 0.62;
                glow(ctx, x, y, r * 2.6, item.color, 0.35);
                ctx.beginPath(); ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * enter);
                ctx.strokeStyle = item.color; ctx.lineWidth = 2.5 * unit; ctx.stroke();
                ctx.beginPath(); ctx.arc(x, y, r * 0.7, 0, Math.PI * 2);
                ctx.strokeStyle = "rgba(230,244,255,0.4)"; ctx.lineWidth = 1 * unit; ctx.stroke();
                text(ctx, item.symbol, x, y, Math.max(13, (mobile ? 17 : 27) * unit),
                    { color: item.color, weight: 800 });
                text(ctx, item.title, x, y + r + 22 * unit, Math.max(10, 16 * unit),
                    { color: "#f1f8ff", weight: 800 });
            });
        });
    });
};

const checks = [
    { title: "LEGAL", subtitle: "Airspace and permits", color: BLUE },
    { title: "LOGISTICAL", subtitle: "Reliable delivery", color: AMBER },
    { title: "SOCIETAL", subtitle: "Public trust", color: MINT },
];
const rules = (f: Frame, v: View, t: number, alpha: number) => {
    const { ctx, W, safe } = f, { at, unit, mobile } = v, span = safe.bottom - safe.top;
    faded(ctx, alpha, () => {
        const zone = at(5.9, 6.8, 0.7), corridor = at(5.05, 4.4, 2.2);
        glow(ctx, zone.x, zone.y, 80 * unit, RED, 0.25);
        ctx.strokeStyle = RED; ctx.lineWidth = 2 * unit; ctx.setLineDash([6 * unit, 5 * unit]);
        ctx.beginPath(); ctx.ellipse(zone.x, zone.y, 52 * unit, 28 * unit, -0.4, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
        text(ctx, "RESTRICTED AIRSPACE", zone.x, zone.y + 42 * unit, Math.max(10, 14 * unit),
            { color: RED, weight: 800 });
        drone(ctx, corridor.x, corridor.y + Math.sin(t * 3) * 3 * unit, 20 * unit, t);
        checks.forEach((check, i) => {
            const shown = easeOut(progress(t, T.rules + 0.7 + i * 0.72, T.rules + 1.4 + i * 0.72));
            faded(ctx, shown, () => {
                const x = mobile ? W * 0.28 : W * (0.23 + i * 0.27);
                const y = mobile ? safe.top + span * (0.51 + i * 0.12) : safe.top + span * 0.18;
                const radius = (mobile ? 12 : 17) * unit;
                glow(ctx, x, y, radius * 3, check.color, 0.35);
                ctx.strokeStyle = check.color; ctx.lineWidth = 2 * unit;
                ctx.beginPath(); ctx.arc(x, y, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * shown); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(x - radius * 0.35, y); ctx.lineTo(x - radius * 0.05, y + radius * 0.3);
                ctx.lineTo(x + radius * 0.48, y - radius * 0.4); ctx.stroke();
                const labelX = mobile ? x + 28 * unit : x;
                text(ctx, check.title, labelX, y + (mobile ? -7 : 43) * unit,
                    Math.max(11, 20 * unit), { color: "#f1f8ff", weight: 800, align: mobile ? "left" : "center" });
                text(ctx, check.subtitle, labelX, y + (mobile ? 12 : 65) * unit,
                    Math.max(10, 13 * unit), { color: "#a9c4df", align: mobile ? "left" : "center" });
            });
        });
        const ready = ease(progress(t, T.rules + 4.5, T.rules + 5.5));
        text(ctx, "A SAFE CROSS-BORDER CORRIDOR", W / 2, safe.top + span * (mobile ? 0.9 : 0.77),
            Math.max(11, 19 * unit), { color: MINT, weight: 800, alpha: ready });
    });
};

const nodes = [{ x: 0.2, y: 0.25 }, { x: 0.38, y: 0.15 }, { x: 0.68, y: 0.21 },
    { x: 0.81, y: 0.4 }, { x: 0.64, y: 0.62 }, { x: 0.31, y: 0.6 }];
const links = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [1, 4], [0, 4]];
const region = (f: Frame, v: View, t: number, alpha: number) => {
    const { ctx, W, safe } = f, { unit } = v, span = safe.bottom - safe.top;
    const at = (i: number) => ({ x: nodes[i].x * W, y: safe.top + nodes[i].y * span });
    faded(ctx, alpha, () => {
        links.forEach(([a, b], i) => {
            const shown = ease(progress(t, T.scale + i * 0.35, T.scale + i * 0.35 + 0.9));
            const start = at(a), end = at(b);
            ctx.strokeStyle = `rgba(108,184,255,${0.48 * shown})`;
            ctx.lineWidth = 2.3 * unit; ctx.setLineDash([8 * unit, 7 * unit]);
            ctx.beginPath(); ctx.moveTo(start.x, start.y);
            ctx.lineTo(lerp(start.x, end.x, shown), lerp(start.y, end.y, shown)); ctx.stroke(); ctx.setLineDash([]);
            if (shown > 0.6 && i % 2 === 0) {
                const move = ((t - T.scale) * 0.18 + i * 0.17) % 1;
                drone(ctx, lerp(start.x, end.x, move), lerp(start.y, end.y, move) - 10 * unit, 7 * unit, t, shown);
            }
        });
        nodes.forEach((_, i) => {
            const shown = progress(t, T.scale + i * 0.3, T.scale + i * 0.3 + 0.6);
            const q = at(i);
            glow(ctx, q.x, q.y, 65 * unit, i === 0 || i === 4 ? RED : BLUE, shown * 0.35);
            ctx.fillStyle = i === 0 || i === 4 ? RED : BLUE;
            ctx.beginPath(); ctx.arc(q.x, q.y, 8 * unit * shown, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = "rgba(220,240,255,0.7)"; ctx.lineWidth = 1.5 * unit;
            ctx.beginPath(); ctx.arc(q.x, q.y, 17 * unit * shown, 0, Math.PI * 2); ctx.stroke();
        });
        text(ctx, "ONE CORRIDOR → A REGIONAL MODEL", W / 2, safe.top + span * 0.79,
            Math.max(12, 23 * unit), { color: "#e7f4ff", weight: 800,
                alpha: progress(t, T.scale + 3.1, T.scale + 4.1) });
    });
};

const draw = (f: Frame) => {
    const v = view(f), t = f.t;
    const worldA = progress(t, T.emergency, T.emergency + 1) * (1 - progress(t, T.cargo, T.cargo + 1.2))
        + progress(t, T.rules, T.rules + 0.8) * (1 - progress(t, T.scale, T.scale + 1)) * 0.42;
    world(f, v, t, worldA);
    road(f, v, t, window01(t, T.road, T.cargo + 0.3, 0.8));
    flight(f, v, t, window01(t, T.drone, T.cargo + 0.3, 0.7));
    cargo(f, v, t, window01(t, T.cargo, T.rules + 0.6, 0.9));
    rules(f, v, t, window01(t, T.rules, T.scale + 0.6, 0.8));
    region(f, v, t, window01(t, T.scale, T.outro + 0.5, 0.9));
    f.ctx.globalAlpha = 1;
};
const updateDom = (t: number) => {
    const next = sceneAt<Scene>(t, [["intro", 0], ["emergency", T.emergency], ["road", T.road],
        ["drone", T.drone], ["cargo", T.cargo], ["rules", T.rules], ["scale", T.scale], ["outro", T.outro], ["credits", T.credits]]);
    if (scene.value !== next) scene.value = next;
};
useCanvasTimeline(canvas, T.end, draw, { tick: updateDom, done: () => emit("done") });
</script>
