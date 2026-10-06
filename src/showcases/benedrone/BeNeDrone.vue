<template>
    <ShowcaseStage ref="stage" :scene="scene" :captions="captions" eyebrow="A BISS project funded by Interreg Flanders-Netherlands"
        title="BeNeDrone" tagline="Medical drones across the Dutch-Belgian border"
        outro="Preparing the Southern Netherlands and Flanders for responsible, cross-border medical drones."
        url="interregvlaned.eu/benedrone"
        :partners="['Maastricht University', 'Maastricht UMC+', 'KU Leuven', 'Dutch Drone Centre Aviolanda']"
        :funders="['Interreg Flanders–Netherlands (ERDF)']" :members="members" />
</template>
<script setup lang="ts">
import { computed, ref } from "vue";
import ShowcaseStage from "../shared/ShowcaseStage.vue";
import {
    callout,
    ease,
    easeOut,
    Frame,
    glow,
    lerp,
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
const T = { emergency: 3.5, road: 8.5, drone: 13.5, cargo: 18, rules: 22.5, scale: 29, outro: 34, end: 40 };

type Scene = "intro" | "emergency" | "road" | "drone" | "cargo" | "rules" | "scale" | "outro";
const captions: Record<string, string> = {
    emergency: "An emergency, just across the border.",
    road: "By road, help has to wind its way there. Every minute counts.",
    drone: "A medical drone can fly straight there, across the border.",
    cargo: "Carrying what saves lives: defibrillators, blood, even organs.",
    rules: "But whose rules apply in the air? BeNeDrone works out how to fly safely, legally and responsibly.",
    scale: "A model for other European border regions, ready for the EU's new drone rules.",
};

const stage = ref<InstanceType<typeof ShowcaseStage>>();
const canvas = computed(() => stage.value?.canvas);
const scene = ref<Scene>("intro");

const RED = "#ff4d4f";
const BLUE = "#6cb8ff";

//#region Map, in 0..1 coordinates

const HOSPITAL: Point = { x: 0.76, y: 0.26 };
const EMERGENCY: Point = { x: 0.3, y: 0.85 };
/** The national border, as a gentle curve from the bottom left to the top right. */
const borderY = (x: number) => 0.85 - x * 0.62 + Math.sin(x * 9) * 0.03;
/** A winding road from the hospital to the emergency, crossing the border once. */
const ROAD: Point[] = [
    HOSPITAL,
    { x: 0.7, y: 0.34 },
    { x: 0.6, y: 0.29 },
    { x: 0.52, y: 0.38 },
    { x: 0.5, y: 0.5 },
    { x: 0.45, y: 0.62 },
    { x: 0.4, y: 0.8 },
    { x: 0.34, y: 0.9 },
    EMERGENCY,
];
/** Restricted airspace on the direct line, e.g. around an airport. */
const NO_FLY: Point = { x: 0.53, y: 0.555 };
const NO_FLY_R = 0.075;
const CARGO = [
    { label: "Defibrillator (AED)", color: "#5ee0a0", icon: "aed" },
    { label: "Blood", color: RED, icon: "blood" },
    { label: "Donor organ", color: "#9fb6ff", icon: "organ" },
] as const;
const CHECKS = ["Legal", "Logistical", "Societal"];

/** A quiet street and building layer gives the route a place to travel through. */
const blocks = (() => {
    const random = mulberry32(42);
    return Array.from({ length: 120 }, () => {
        const centre = random() < 0.5 ? HOSPITAL : EMERGENCY;
        return {
            x: centre.x + (random() - 0.5) * 0.55,
            y: centre.y + (random() - 0.5) * 0.55,
            w: 0.008 + random() * 0.016,
            h: 0.008 + random() * 0.024,
        };
    }).filter((b) => b.x > 0.07 && b.x < 0.93 && b.y > 0.09 && b.y < 0.88);
})();

//#endregion

const along = (path: Point[], f: number): Point => {
    const lengths = path.slice(1).map((p, i) => Math.hypot(p.x - path[i].x, p.y - path[i].y));
    let d = f * lengths.reduce((a, b) => a + b, 0);
    for (let i = 0; i < lengths.length; i++) {
        if (d <= lengths[i]) {
            const q = d / lengths[i];
            return { x: lerp(path[i].x, path[i + 1].x, q), y: lerp(path[i].y, path[i + 1].y, q) };
        }
        d -= lengths[i];
    }
    return path[path.length - 1];
};

/** A path from the hospital to the emergency that bends around the restricted zone. */
const detour = (bend: number): Point[] =>
    Array.from({ length: 41 }, (_, i) => {
        const f = i / 40;
        const p = { x: lerp(HOSPITAL.x, EMERGENCY.x, f), y: lerp(HOSPITAL.y, EMERGENCY.y, f) };
        // push sideways (to the upper left on screen), most in the middle; y units are
        // about half the size of x units on a wide screen, hence the different weights
        const push = Math.sin(f * Math.PI) * bend * (NO_FLY_R + 0.06);
        return { x: p.x - push * 0.62, y: p.y - push * 0.95 };
    });

const quadcopter = (ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = s * 0.16;
    ctx.beginPath();
    ctx.moveTo(-s, -s);
    ctx.lineTo(s, s);
    ctx.moveTo(s, -s);
    ctx.lineTo(-s, s);
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.roundRect(-s * 0.42, -s * 0.32, s * 0.84, s * 0.64, s * 0.15);
    ctx.fill();
    ctx.fillStyle = RED;
    ctx.fillRect(-s * 0.08, -s * 0.24, s * 0.16, s * 0.48);
    ctx.fillRect(-s * 0.24, -s * 0.08, s * 0.48, s * 0.16);
    for (const [dx, dy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        ctx.strokeStyle = "rgba(255,255,255,0.75)";
        ctx.lineWidth = s * 0.08;
        ctx.beginPath();
        ctx.ellipse(dx * s, dy * s, s * 0.55, s * 0.55 * Math.abs(Math.sin(t * 40 + dx)), 0, 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.restore();
};

const cargoIcon = (ctx: CanvasRenderingContext2D, icon: (typeof CARGO)[number]["icon"], x: number, y: number, s: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "#fff";
    if (icon === "blood") {
        ctx.fillStyle = RED;
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.bezierCurveTo(s * 0.9, -s * 0.1, s * 0.75, s * 0.85, 0, s * 0.85);
        ctx.bezierCurveTo(-s * 0.75, s * 0.85, -s * 0.9, -s * 0.1, 0, -s);
        ctx.fill();
    } else if (icon === "aed") {
        ctx.fillStyle = "#5ee0a0";
        ctx.beginPath();
        ctx.roundRect(-s, -s * 0.8, s * 2, s * 1.6, s * 0.3);
        ctx.fill();
        ctx.fillStyle = "#06201d";
        ctx.beginPath();
        ctx.moveTo(s * 0.15, -s * 0.6);
        ctx.lineTo(-s * 0.35, s * 0.08);
        ctx.lineTo(0, s * 0.08);
        ctx.lineTo(-s * 0.15, s * 0.6);
        ctx.lineTo(s * 0.35, -s * 0.08);
        ctx.lineTo(0, -s * 0.08);
        ctx.closePath();
        ctx.fill();
    } else {
        ctx.fillStyle = "#9fb6ff";
        ctx.beginPath();
        ctx.roundRect(-s, -s * 0.7, s * 2, s * 1.5, s * 0.25);
        ctx.fill();
        ctx.fillStyle = "#0f1530";
        ctx.fillRect(-s, -s * 0.7, s * 2, s * 0.35);
        ctx.fillStyle = "#fff";
        ctx.fillRect(-s * 0.08, -s * 0.1, s * 0.16, s * 0.6);
        ctx.fillRect(-s * 0.3, s * 0.12, s * 0.6, s * 0.16);
    }
    ctx.restore();
};

const draw = ({ ctx, t, W, H, k, safe }: Frame) => {
    const span = safe.bottom - safe.top;
    const mx = (p: Point) => W * 0.05 + p.x * W * 0.9;
    const my = (p: Point) => safe.top + p.y * span;
    const at = (p: Point) => ({ x: mx(p), y: my(p) });

    const scale = ease(progress(t, T.scale, T.scale + 1.2));
    const mapAlpha = progress(t, T.emergency, T.emergency + 1) * (1 - scale) * (1 - progress(t, T.outro, T.outro + 1));

    if (mapAlpha > 0.003) {
        //#region the two countries and the border
        // the Dutch side, across the full width of the screen
        ctx.globalAlpha = mapAlpha * 0.06;
        ctx.fillStyle = "#ffb347";
        ctx.beginPath();
        ctx.moveTo(0, 0);
        for (let x = -0.1; x <= 1.1001; x += 0.02) ctx.lineTo(mx({ x, y: 0 }), my({ x, y: borderY(x) }));
        ctx.lineTo(W, 0);
        ctx.closePath();
        ctx.fill();

        // Street grid and neighbourhoods, revealed as the camera settles on the border.
        const detail = mapAlpha * ease(progress(t, T.emergency + 0.2, T.emergency + 2));
        ctx.save();
        ctx.globalAlpha = detail * 0.28;
        ctx.strokeStyle = "#9fb6ff";
        ctx.lineWidth = k;
        for (let i = 0; i < 12; i++) {
            const x = W * (0.1 + i * 0.073);
            ctx.beginPath();
            ctx.moveTo(x, safe.top);
            ctx.lineTo(x + Math.sin(i * 2.2) * 80 * k, safe.bottom);
            ctx.stroke();
        }
        for (let i = 0; i < 8; i++) {
            const y = safe.top + span * (0.08 + i * 0.115);
            ctx.beginPath();
            ctx.moveTo(W * 0.08, y);
            ctx.lineTo(W * 0.92, y + Math.sin(i * 2.7) * 42 * k);
            ctx.stroke();
        }
        ctx.globalAlpha = detail * 0.22;
        ctx.fillStyle = "#9fb6ff";
        for (const b of blocks) ctx.fillRect(mx(b), my(b), b.w * W * 0.9, b.h * span);
        ctx.restore();

        ctx.globalAlpha = mapAlpha * 0.6;
        ctx.strokeStyle = "rgba(255,255,255,0.7)";
        ctx.lineWidth = 2 * k;
        ctx.setLineDash([10 * k, 8 * k]);
        ctx.beginPath();
        for (let x = -0.1; x <= 1.1001; x += 0.02) {
            const p = { x: mx({ x, y: 0 }), y: my({ x, y: borderY(x) }) };
            if (x === -0.1) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        // country names at the sides, clear of the cards along the top
        text(ctx, "NETHERLANDS", mx({ x: -0.03, y: 0 }), my({ x: 0, y: 0.5 }), 22 * k, { align: "left", weight: 700, color: "rgba(255,255,255,0.5)", alpha: mapAlpha });
        text(ctx, "FLANDERS (BELGIUM)", mx({ x: 1.03, y: 0 }), my({ x: 0, y: 0.62 }), 22 * k, { align: "right", weight: 700, color: "rgba(255,255,255,0.5)", alpha: mapAlpha });
        text(ctx, "BORDER REGION", W / 2, safe.top + 20 * k, 15 * k, { weight: 700, color: "rgba(255,255,255,0.55)", alpha: mapAlpha });
        //#endregion

        //#region hospital and emergency
        const hospital = at(HOSPITAL);
        ctx.globalAlpha = mapAlpha;
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.roundRect(hospital.x - 30 * k, hospital.y - 30 * k, 60 * k, 60 * k, 10 * k);
        ctx.fill();
        text(ctx, "H", hospital.x, hospital.y + 2 * k, 36 * k, { color: "#0b1020", weight: 800, alpha: mapAlpha });
        // beside the icon: the road and flight paths leave downwards
        text(ctx, "Hospital & drone base", hospital.x + 46 * k, hospital.y, 18 * k, { align: "left", weight: 500, color: "rgba(255,255,255,0.8)", alpha: mapAlpha });

        const emergencyIn = progress(t, T.emergency + 0.8, T.emergency + 1.3);
        const e = at(EMERGENCY);
        if (emergencyIn > 0) {
            for (let i = 0; i < 3; i++) {
                const phase = (t * 0.7 + i / 3) % 1;
                ctx.globalAlpha = mapAlpha * emergencyIn * (1 - phase);
                ctx.strokeStyle = RED;
                ctx.lineWidth = 3 * k;
                ctx.beginPath();
                ctx.arc(e.x, e.y, (16 + phase * 70) * k, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.globalAlpha = mapAlpha * emergencyIn;
            ctx.fillStyle = RED;
            ctx.beginPath();
            ctx.arc(e.x, e.y, 18 * k, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#fff";
            ctx.fillRect(e.x - 3 * k, e.y - 10 * k, 6 * k, 20 * k);
            ctx.fillRect(e.x - 10 * k, e.y - 3 * k, 20 * k, 6 * k);
            callout(ctx, e.x, e.y - 40 * k, "Cardiac arrest", "just across the border", k, mapAlpha * window01(t, T.emergency + 1.4, T.road + 0.6, 0.4));
        }
        //#endregion

        //#region by road
        const roadIn = progress(t, T.road, T.road + 1.2);
        if (roadIn > 0) {
            ctx.globalAlpha = mapAlpha * 0.5;
            ctx.strokeStyle = "rgba(255,255,255,0.55)";
            ctx.lineWidth = 6 * k;
            ctx.lineJoin = "round";
            ctx.beginPath();
            const shown = Math.ceil(ROAD.length * roadIn);
            ROAD.slice(0, shown).forEach((p, i) => (i ? ctx.lineTo(mx(p), my(p)) : ctx.moveTo(mx(p), my(p))));
            ctx.stroke();
            // the ambulance only gets part of the way while the drone flies
            const f = 0.62 * easeOut(progress(t, T.road + 0.8, T.cargo + 2));
            const a = at(along(ROAD, f));
            ctx.globalAlpha = mapAlpha;
            ctx.fillStyle = "#fff";
            ctx.beginPath();
            ctx.roundRect(a.x - 18 * k, a.y - 11 * k, 36 * k, 22 * k, 5 * k);
            ctx.fill();
            ctx.fillStyle = (t * 3) % 1 < 0.5 ? RED : BLUE;
            ctx.fillRect(a.x - 5 * k, a.y - 16 * k, 10 * k, 5 * k);
            if (t > T.drone + 1) callout(ctx, a.x, a.y - 26 * k, "By road", "still on the way", k, mapAlpha * window01(t, T.drone + 3, T.rules, 0.4));
            text(ctx, "THE ROAD ROUTE", W * 0.51, safe.bottom - 32 * k, 17 * k, {
                color: "rgba(255,255,255,0.76)", weight: 700,
                alpha: mapAlpha * window01(t, T.road + 0.3, T.rules, 0.5),
            });
        }
        //#endregion

        //#region by air
        const flight = ease(progress(t, T.drone + 0.6, T.drone + 3.4));
        const reroute = ease(progress(t, T.rules + 2.4, T.rules + 3.6));
        const noFly = window01(t, T.rules + 0.4, T.scale + 0.2, 0.6);
        if (noFly > 0) {
            const z = at(NO_FLY);
            const r = NO_FLY_R * W * 0.9;
            ctx.globalAlpha = mapAlpha * noFly * 0.18;
            ctx.fillStyle = RED;
            ctx.beginPath();
            ctx.arc(z.x, z.y, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = mapAlpha * noFly * 0.9;
            ctx.strokeStyle = RED;
            ctx.lineWidth = 2.5 * k;
            ctx.stroke();
            text(ctx, "Restricted airspace", z.x, z.y, 18 * k, { alpha: mapAlpha * noFly });
        }
        if (flight > 0) {
            const path = detour(reroute);
            ctx.globalAlpha = mapAlpha * 0.8;
            ctx.strokeStyle = BLUE;
            ctx.lineWidth = 3 * k;
            ctx.setLineDash([12 * k, 8 * k]);
            ctx.beginPath();
            path.forEach((p, i) => (i ? ctx.lineTo(mx(p), my(p)) : ctx.moveTo(mx(p), my(p))));
            ctx.stroke();
            ctx.setLineDash([]);

            // the first flight, then the drone shuttles while the cargo is shown
            const shuttle = t > T.cargo ? (Math.sin((t - T.cargo) * 0.9 - Math.PI / 2) + 1) / 2 : 0;
            const f = t < T.cargo ? flight : 1 - shuttle;
            const d = at(along(path, f));
            glow(ctx, d.x, d.y, 70 * k, BLUE, mapAlpha * 0.5);
            ctx.globalAlpha = mapAlpha;
            quadcopter(ctx, d.x, d.y - 4 * k * Math.sin(t * 3), 20 * k, t);
            if (t < T.cargo) callout(ctx, d.x, d.y - 36 * k, "Medical drone", "direct flight", k, mapAlpha * window01(t, T.drone + 0.8, T.cargo, 0.4));
            text(ctx, "DIRECT FLIGHT", W * 0.48, safe.top + 82 * k, 23 * k, {
                color: BLUE, weight: 800,
                alpha: mapAlpha * window01(t, T.drone + 0.5, T.rules, 0.6),
            });
        }
        //#endregion

        //#region what drones carry
        CARGO.forEach((c, i) => {
            const f = easeOut(window01(t, T.cargo + 0.5 + i * 0.8, T.rules, 0.5));
            if (f <= 0) return;
            const x = W * (0.27 + i * 0.23);
            const y = safe.top + 90 * k;
            const rise = (1 - f) * 25 * k;
            ctx.globalAlpha = mapAlpha * f * 0.6;
            ctx.strokeStyle = c.color;
            ctx.lineWidth = 1.5 * k;
            ctx.beginPath();
            ctx.arc(x, y + rise, 38 * k, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = mapAlpha * f;
            cargoIcon(ctx, c.icon, x, y + rise, 20 * k);
            text(ctx, c.label, x, y + rise + 65 * k, 18 * k, { color: "rgba(255,255,255,0.9)" });
        });
        //#endregion

        //#region two rulebooks become one framework
        const books = progress(t, T.rules + 0.6, T.rules + 1.2);
        if (books > 0) {
            const merge = ease(progress(t, T.rules + 3, T.rules + 4.2));
            const fade = 1 - progress(t, T.scale - 0.4, T.scale);
            const rule = (x: number, label: string, color: string, alpha: number) => {
                const y = safe.top + 78 * k;
                ctx.globalAlpha = mapAlpha * alpha * fade;
                ctx.strokeStyle = color;
                ctx.lineWidth = 3 * k;
                ctx.beginPath();
                ctx.moveTo(x - 120 * k, y + 28 * k);
                ctx.lineTo(x + 120 * k, y + 28 * k);
                ctx.stroke();
                text(ctx, label, x, y, 23 * k, { color, weight: 700 });
            };
            rule(lerp(W * 0.29, W * 0.5, merge), "DUTCH RULES", "#ff9f43", books * (1 - merge));
            rule(lerp(W * 0.71, W * 0.5, merge), "BELGIAN RULES", "#ffd43b", books * (1 - merge));
            if (merge > 0) {
                rule(W * 0.5, "ONE CROSS-BORDER FRAMEWORK", BLUE, merge);
                CHECKS.forEach((c, i) => {
                    const f = progress(t, T.rules + 4.4 + i * 0.4, T.rules + 4.8 + i * 0.4) * fade;
                    if (f <= 0) return;
                    const x = W * 0.5 + (i - 1) * 200 * k;
                    const y = safe.top + 154 * k;
                    ctx.globalAlpha = mapAlpha * f;
                    ctx.fillStyle = "#5ee0a0";
                    ctx.beginPath();
                    ctx.arc(x - 52 * k, y, 14 * k, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = "#06201d";
                    ctx.lineWidth = 3 * k;
                    ctx.beginPath();
                    ctx.moveTo(x - 59 * k, y);
                    ctx.lineTo(x - 54 * k, y + 5 * k);
                    ctx.lineTo(x - 45 * k, y - 6 * k);
                    ctx.stroke();
                    text(ctx, c, x - 30 * k, y, 20 * k, { align: "left", alpha: mapAlpha * f });
                });
            }
        }
        //#endregion
    }

    //#region other border regions
    const regions = scale * (1 - progress(t, T.outro, T.outro + 1) * 0.85);
    if (regions > 0.003) {
        const borders = [
            { x: 0.2, y: 0.2, a: 0.6 },
            { x: 0.45, y: 0.3, a: -0.4 },
            { x: 0.75, y: 0.22, a: 1.2 },
            { x: 0.3, y: 0.55, a: -1 },
            { x: 0.6, y: 0.6, a: 0.3 },
            { x: 0.85, y: 0.52, a: -0.7 },
            { x: 0.5, y: 0.45, a: 0.9 },
        ];
        borders.forEach((b, i) => {
            const f = progress(t, T.scale + 0.6 + i * 0.35, T.scale + 1.1 + i * 0.35);
            if (f <= 0) return;
            const c = { x: W * b.x, y: safe.top + b.y * span };
            const len = 130 * k;
            const dx = Math.cos(b.a) * len;
            const dy = Math.sin(b.a) * len;
            ctx.globalAlpha = regions * f * 0.7;
            ctx.strokeStyle = "rgba(255,255,255,0.7)";
            ctx.lineWidth = 2 * k;
            ctx.setLineDash([8 * k, 6 * k]);
            ctx.beginPath();
            ctx.moveTo(c.x - dx, c.y - dy);
            ctx.lineTo(c.x + dx, c.y + dy);
            ctx.stroke();
            ctx.setLineDash([]);
            // a drone hopping across this border
            const hop = ((t - T.scale) * 0.5 + i * 0.3) % 1;
            const nx = -dy / len;
            const ny = dx / len;
            const s = (hop - 0.5) * 2 * 70 * k;
            const p = { x: c.x + nx * s, y: c.y + ny * s - Math.sin(hop * Math.PI) * 18 * k };
            glow(ctx, p.x, p.y, 40 * k, BLUE, regions * f * 0.5);
            ctx.globalAlpha = regions * f;
            quadcopter(ctx, p.x, p.y, 10 * k, t);
        });
        text(ctx, "EU Drone Strategy 2.0", W / 2, H * 0.1, 22 * k, { color: "rgba(255,255,255,0.7)", alpha: regions * progress(t, T.scale + 1.8, T.scale + 2.4) });
    }
    //#endregion
};

const updateDom = (t: number) => {
    const next = sceneAt<Scene>(t, [
        ["intro", 0],
        ["emergency", T.emergency],
        ["road", T.road],
        ["drone", T.drone],
        ["cargo", T.cargo],
        ["rules", T.rules],
        ["scale", T.scale],
        ["outro", T.outro],
    ]);
    if (scene.value !== next) scene.value = next;
};

useCanvasTimeline(canvas, T.end, draw, { tick: updateDom, done: () => emit("done") });
</script>
