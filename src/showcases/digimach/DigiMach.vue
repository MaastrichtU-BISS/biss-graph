<template>
    <ShowcaseStage ref="stage" :scene="scene" :captions="captions" eyebrow="A BISS project funded by Interreg Meuse-Rhine"
        title="DigiMach" tagline="Smart, sustainable and connected manufacturing"
        outro="BISS builds the multilingual DigiMach platform, connecting manufacturers across borders."
        url="digimach.eu/en"
        :partners="['Sirris', 'Technifutur', 'Maastricht University', 'Brightlands Smart Services Campus']"
        :funders="['European Union (Interreg Meuse-Rhine)', 'Walloon Region', 'Land NRW', 'Ministry of Economic Affairs']"
        :members="members" />
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
const T = { region: 3.5, challenge: 9.5, hub: 14, platform: 20, transform: 28, outro: 34, end: 40 };

type Scene = "intro" | "region" | "challenge" | "hub" | "platform" | "transform" | "outro";
const captions: Record<string, string> = {
    region: "Many small manufacturers work in the border region of the Netherlands, Belgium and Germany.",
    challenge: "Going digital on your own is hard: which tools, what does it cost, who trains the staff?",
    hub: "DigiMach connects them in one cross-border innovation hub, together with universities and governments.",
    platform: "BISS builds the DigiMach platform: assess digital tools, train staff and share experiences, in your own language.",
    transform: "So manufacturers across the region become more competitive, resilient and sustainable.",
};

const stage = ref<InstanceType<typeof ShowcaseStage>>();
const canvas = computed(() => stage.value?.canvas);
const scene = ref<Scene>("intro");

const TEAL = "#4dd4c6";

//#region Content

/** An abstract map of the Meuse-Rhine region: which country a point (0..1) is in. */
const countryAt = (x: number, y: number) => (x > 0.6 + (y - 0.5) * 0.12 ? "DE" : y < 0.47 + Math.sin(x * 7) * 0.04 ? "NL" : "BE");
/** Labels sit at the map's edges, clear of the factories. */
const COUNTRIES: { id: string; name: string; at: Point; align: CanvasTextAlign }[] = [
    { id: "NL", name: "Netherlands", at: { x: -0.04, y: 0.08 }, align: "left" },
    { id: "BE", name: "Belgium", at: { x: -0.04, y: 0.9 }, align: "left" },
    { id: "DE", name: "Germany", at: { x: 1.04, y: 0.08 }, align: "right" },
];

const random = mulberry32(11);
/** Factories spread over the map, away from the centre where the hub goes. */
const FACTORIES: Point[] = [];
while (FACTORIES.length < 15) {
    const p = { x: 0.14 + random() * 0.72, y: 0.14 + random() * 0.62 };
    const far = Math.hypot(p.x - 0.5, (p.y - 0.45) * 1.6) > 0.21;
    const spaced = FACTORIES.every((f) => Math.hypot(f.x - p.x, (f.y - p.y) * 1.6) > 0.1);
    if (far && spaced) FACTORIES.push(p);
}
/** The factory closest to a spot, so callouts can be spread over the map. */
const nearest = (x: number, y: number) =>
    FACTORIES.reduce((best, f, i) => (Math.hypot(f.x - x, f.y - y) < Math.hypot(FACTORIES[best].x - x, FACTORIES[best].y - y) ? i : best), 0);
const QUESTIONS = [
    { text: "Which tools?", at: nearest(0.2, 0.3) },
    { text: "What does it cost?", at: nearest(0.78, 0.25) },
    { text: "Who trains our staff?", at: nearest(0.55, 0.75) },
];
const BENEFITS = [
    { text: "Competitive", at: nearest(0.3, 0.7) },
    { text: "Resilient", at: nearest(0.8, 0.6) },
    { text: "Sustainable", at: nearest(0.45, 0.15) },
];
const PARTNERS = [
    { label: "Universities", angle: -2.5, reach: 1 },
    { label: "Governments", angle: -0.64, reach: 1 },
    // further out, below the hub's own label
    { label: "Training centres", angle: Math.PI / 2, reach: 1.45 },
];

const LANGUAGES = ["EN", "NL", "FR", "DE"] as const;
const WORDS: Record<string, Record<(typeof LANGUAGES)[number], string>> = {
    assess: { EN: "Assess", NL: "Beoordelen", FR: "Évaluer", DE: "Bewerten" },
    train: { EN: "Train", NL: "Trainen", FR: "Former", DE: "Schulen" },
    share: { EN: "Share", NL: "Delen", FR: "Partager", DE: "Teilen" },
    readiness: { EN: "Digital readiness", NL: "Digitale paraatheid", FR: "Maturité numérique", DE: "Digitale Reife" },
};
const COURSES = ["Predictive maintenance", "Robot welding basics", "Energy monitoring"];
const POSTS = [
    { from: "Maastricht", text: "Our first cobot is running!" },
    { from: "Liège", text: "Nous testons des capteurs IoT." },
    { from: "Aachen", text: "Wer hat Erfahrung mit MES?" },
];

//#endregion

const factory = (ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string, lit: number) => {
    // a building with a sawtooth roof and a chimney
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - s, y + s * 0.6);
    ctx.lineTo(x - s, y - s * 0.2);
    for (let i = 0; i < 3; i++) {
        const x0 = x - s + (i * 2 * s) / 3;
        ctx.lineTo(x0 + (2 * s) / 3, y - s * 0.55);
        ctx.lineTo(x0 + (2 * s) / 3, y - s * 0.2);
    }
    ctx.lineTo(x + s, y + s * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(x + s * 0.55, y - s * 1.05, s * 0.28, s * 0.7);
    // windows light up once connected
    ctx.fillStyle = lit > 0 ? `rgba(255, 236, 160, ${lit})` : "rgba(6,9,20,0.55)";
    for (let i = 0; i < 3; i++) ctx.fillRect(x - s * 0.7 + i * s * 0.52, y + s * 0.02, s * 0.32, s * 0.28);
};

const draw = ({ ctx, t, W, H, k, safe }: Frame) => {
    const span = safe.bottom - safe.top;
    const mapX = (p: Point) => W * 0.06 + p.x * W * 0.88;
    const mapY = (p: Point) => safe.top + p.y * span;
    const hub = { x: W / 2, y: mapY({ x: 0, y: 0.45 }) };

    const platform = ease(progress(t, T.platform, T.platform + 0.9)) * (1 - ease(progress(t, T.transform - 0.5, T.transform)));
    // the map stays hidden until the platform has nearly gone, so the two never blend
    const mapAlpha =
        progress(t, T.region, T.region + 1) *
        (1 - Math.min(1, platform * 1.4)) *
        (1 - 0.8 * progress(t, T.outro, T.outro + 1));
    //#region the platform BISS builds
    const drawPlatform = () => {
    if (platform > 0.003) {
        const lang = LANGUAGES[Math.floor(Math.max(0, t - T.platform - 1.6) / 1.5) % LANGUAGES.length];
        const w = Math.min(W * 0.62, 1100 * k);
        const h = Math.min(span * 0.95, 560 * k);
        const x0 = W / 2 - w / 2;
        const y0 = safe.top + span / 2 - h / 2 + (1 - platform) * 40 * k;
        ctx.save();
        ctx.globalAlpha = platform;
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.roundRect(x0, y0, w, h, 12 * k);
        ctx.fill();

        // header with the language switch
        ctx.fillStyle = "#06201d";
        ctx.beginPath();
        ctx.roundRect(x0, y0, w, 70 * k, [12 * k, 12 * k, 0, 0]);
        ctx.fill();
        text(ctx, "DigiMach platform", x0 + 28 * k, y0 + 35 * k, 24 * k, { align: "left" });
        LANGUAGES.forEach((l, i) => {
            const bx = x0 + w - 28 * k - (LANGUAGES.length - i) * 58 * k;
            const active = l === lang;
            ctx.fillStyle = active ? TEAL : "rgba(255,255,255,0.12)";
            ctx.beginPath();
            ctx.roundRect(bx, y0 + 18 * k, 48 * k, 34 * k, 17 * k);
            ctx.fill();
            text(ctx, l, bx + 24 * k, y0 + 35 * k, 16 * k, { color: active ? "#06201d" : "#fff", weight: 700 });
        });

        const tileW = (w - 4 * 24 * k) / 3;
        const tileY = y0 + 98 * k;
        const tileH = h - 122 * k;
        const tile = (i: number) => x0 + 24 * k + i * (tileW + 24 * k);
        ["assess", "train", "share"].forEach((key, i) => {
            const f = easeOut(progress(t, T.platform + 0.8 + i * 0.4, T.platform + 1.4 + i * 0.4));
            ctx.globalAlpha = platform * f;
            ctx.fillStyle = "#f3f6f9";
            ctx.beginPath();
            ctx.roundRect(tile(i), tileY, tileW, tileH, 10 * k);
            ctx.fill();
            text(ctx, WORDS[key][lang], tile(i) + 20 * k, tileY + 34 * k, 26 * k, {
                color: "#000",
                weight: 700,
                align: "left",
                alpha: 1,
                maxWidth: tileW - 40 * k,
            });
        });

        // assess: a readiness score climbing
        const score = ease(progress(t, T.platform + 2, T.platform + 4.5));
        const ax = tile(0) + tileW / 2;
        const ay = tileY + tileH * 0.56;
        const r = Math.min(tileW, tileH) * 0.3;
        const dial = platform * progress(t, T.platform + 1.2, T.platform + 1.8);
        ctx.globalAlpha = dial;
        ctx.lineWidth = 14 * k;
        ctx.lineCap = "round";
        ctx.strokeStyle = "#e1e7ee";
        ctx.beginPath();
        ctx.arc(ax, ay, r, Math.PI * 0.75, Math.PI * 2.25);
        ctx.stroke();
        ctx.strokeStyle = TEAL;
        ctx.beginPath();
        ctx.arc(ax, ay, r, Math.PI * 0.75, Math.PI * 0.75 + Math.PI * 1.5 * (0.3 + 0.48 * score));
        ctx.stroke();
        ctx.lineCap = "butt";
        text(ctx, `${Math.round(30 + 48 * score)}%`, ax, ay, 34 * k, { color: "#000", weight: 800, alpha: 1 });
        text(ctx, WORDS.readiness[lang], ax, ay + r + 24 * k, 17 * k, { color: "#4b4b4b", weight: 500, alpha: 1, maxWidth: tileW - 32 * k });

        // train: courses being completed
        COURSES.forEach((c, i) => {
            const y = tileY + 84 * k + i * 62 * k;
            const done = progress(t, T.platform + 2.4 + i * 1.2, T.platform + 2.8 + i * 1.2);
            const a = platform * progress(t, T.platform + 1.6, T.platform + 2.2);
            ctx.globalAlpha = a;
            ctx.fillStyle = done > 0 ? TEAL : "#e1e7ee";
            ctx.beginPath();
            ctx.arc(tile(1) + 34 * k, y, 14 * k, 0, Math.PI * 2);
            ctx.fill();
            if (done > 0) {
                ctx.strokeStyle = "#fff";
                ctx.lineWidth = 3 * k;
                ctx.beginPath();
                ctx.moveTo(tile(1) + 27 * k, y);
                ctx.lineTo(tile(1) + 32 * k, y + 5 * k);
                ctx.lineTo(tile(1) + 41 * k, y - 6 * k);
                ctx.stroke();
            }
            text(ctx, c, tile(1) + 58 * k, y, 17 * k, { color: "#1f2937", weight: 500, align: "left", alpha: 1, maxWidth: tileW - 72 * k });
        });

        // share: posts from across the border
        POSTS.forEach((p, i) => {
            const f = easeOut(progress(t, T.platform + 2.2 + i * 1.3, T.platform + 2.7 + i * 1.3));
            if (f <= 0) return;
            const y = tileY + 70 * k + i * 84 * k + (1 - f) * 16 * k;
            ctx.globalAlpha = platform * f;
            ctx.fillStyle = "#fff";
            ctx.beginPath();
            ctx.roundRect(tile(2) + 16 * k, y, tileW - 32 * k, 70 * k, 8 * k);
            ctx.fill();
            text(ctx, p.from, tile(2) + 30 * k, y + 22 * k, 15 * k, { color: "#0f766e", weight: 700, align: "left" });
            text(ctx, p.text, tile(2) + 30 * k, y + 48 * k, 16 * k, {
                color: "#1f2937",
                weight: 500,
                align: "left",
                alpha: 1,
                maxWidth: tileW - 60 * k,
            });
        });
        ctx.restore();
    }
    };
    //#endregion

    if (mapAlpha <= 0.003) {
        drawPlatform();
        return;
    }

    //#region map
    const step = 26 * k;
    for (let y = step; y < H * 0.88; y += step) {
        for (let x = step; x < W - step; x += step) {
            const country = countryAt((x - W * 0.06) / (W * 0.88), (y - safe.top) / span);
            ctx.globalAlpha = mapAlpha * 0.32;
            ctx.fillStyle = country === "NL" ? "#ff9f43" : country === "BE" ? "#ffd43b" : "#9fb6ff";
            ctx.fillRect(x, y, 2.4 * k, 2.4 * k);
        }
    }
    // national borders
    ctx.globalAlpha = mapAlpha * 0.55;
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 2 * k;
    ctx.setLineDash([10 * k, 8 * k]);
    ctx.beginPath();
    for (let y = 0; y <= 1.0001; y += 0.02) {
        const x = 0.6 + (y - 0.5) * 0.12;
        if (y === 0) ctx.moveTo(mapX({ x, y }), mapY({ x, y }));
        else ctx.lineTo(mapX({ x, y }), mapY({ x, y }));
    }
    for (let x = 0; x <= 0.6 + (0.47 - 0.5) * 0.12; x += 0.01) {
        const y = 0.47 + Math.sin(x * 7) * 0.04;
        if (x === 0) ctx.moveTo(mapX({ x, y }), mapY({ x, y }));
        else ctx.lineTo(mapX({ x, y }), mapY({ x, y }));
    }
    ctx.stroke();
    ctx.setLineDash([]);
    COUNTRIES.forEach((c) =>
        text(ctx, c.name.toUpperCase(), mapX(c.at), mapY(c.at), 20 * k, {
            align: c.align,
            weight: 700,
            color: "rgba(255,255,255,0.75)",
            alpha: mapAlpha * progress(t, T.region + 0.5, T.region + 1.3),
        })
    );
    //#endregion

    const connected = (i: number) => T.hub + 1 + i * 0.18;
    const lit = (i: number) => progress(t, T.transform + 0.4 + i * 0.1, T.transform + 0.9 + i * 0.1);

    //#region hub, partners and links
    const hubIn = easeOut(progress(t, T.hub + 0.2, T.hub + 1));
    if (hubIn > 0) {
        FACTORIES.forEach((f, i) => {
            const draw = ease(progress(t, connected(i), connected(i) + 0.6));
            if (draw <= 0) return;
            const p = { x: mapX(f), y: mapY(f) };
            ctx.globalAlpha = mapAlpha * 0.45;
            ctx.strokeStyle = TEAL;
            ctx.lineWidth = 1.6 * k;
            ctx.beginPath();
            ctx.moveTo(hub.x, hub.y);
            ctx.lineTo(lerp(hub.x, p.x, draw), lerp(hub.y, p.y, draw));
            ctx.stroke();
            // knowledge flowing both ways
            if (draw >= 1) {
                const phase = (t * 0.45 + i * 0.37) % 1;
                const back = i % 2 === 0;
                const q = back ? 1 - phase : phase;
                ctx.globalAlpha = mapAlpha;
                ctx.fillStyle = "#fff";
                ctx.beginPath();
                ctx.arc(lerp(hub.x, p.x, q), lerp(hub.y, p.y, q), 2.6 * k, 0, Math.PI * 2);
                ctx.fill();
            }
        });
        // factories linked to each other, as a community
        const community = progress(t, T.transform + 1.2, T.transform + 2.4);
        if (community > 0) {
            ctx.strokeStyle = "rgba(255, 236, 160, 0.5)";
            ctx.lineWidth = 1.2 * k;
            FACTORIES.forEach((a, i) =>
                FACTORIES.slice(i + 1).forEach((b) => {
                    if (Math.hypot(a.x - b.x, (a.y - b.y) * 1.6) > 0.24) return;
                    ctx.globalAlpha = mapAlpha * community * 0.6;
                    ctx.beginPath();
                    ctx.moveTo(mapX(a), mapY(a));
                    ctx.lineTo(mapX(b), mapY(b));
                    ctx.stroke();
                })
            );
        }

        PARTNERS.forEach((p, i) => {
            const f = easeOut(progress(t, T.hub + 2.6 + i * 0.4, T.hub + 3.3 + i * 0.4));
            if (f <= 0) return;
            const r = 130 * k * p.reach;
            const x = hub.x + Math.cos(p.angle) * r * 1.4;
            const y = hub.y + Math.sin(p.angle) * r;
            ctx.globalAlpha = mapAlpha * f * 0.6;
            ctx.strokeStyle = "#fff";
            ctx.setLineDash([5 * k, 5 * k]);
            ctx.beginPath();
            ctx.moveTo(hub.x, hub.y);
            ctx.lineTo(x, y);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.globalAlpha = mapAlpha * f;
            ctx.fillStyle = "#fff";
            ctx.beginPath();
            ctx.arc(x, y, 10 * k, 0, Math.PI * 2);
            ctx.fill();
            text(ctx, p.label, x, y + 28 * k, 19 * k, { alpha: mapAlpha * f });
        });

        glow(ctx, hub.x, hub.y, 130 * k, TEAL, mapAlpha * hubIn * (0.55 + 0.15 * Math.sin(t * 3)));
        ctx.globalAlpha = mapAlpha * hubIn;
        ctx.fillStyle = TEAL;
        ctx.beginPath();
        ctx.arc(hub.x, hub.y, 46 * k * hubIn, 0, Math.PI * 2);
        ctx.fill();
        text(ctx, "DigiMach", hub.x, hub.y, 19 * k * hubIn, { color: "#06201d", weight: 800, alpha: mapAlpha * hubIn });
        text(ctx, "Digital Innovation Hub", hub.x, hub.y + 68 * k, 18 * k, {
            weight: 500,
            color: "rgba(255,255,255,0.75)",
            alpha: mapAlpha * hubIn,
        });
    }
    //#endregion

    //#region factories
    FACTORIES.forEach((f, i) => {
        const appear = T.region + 0.8 + i * 0.22;
        const a = easeOut(progress(t, appear, appear + 0.5));
        if (a <= 0) return;
        const x = mapX(f);
        const y = mapY(f);
        const l = lit(i);
        glow(ctx, x, y, 60 * k, "#ffe9a0", mapAlpha * l * 0.5);
        ctx.globalAlpha = mapAlpha * a;
        const color = l > 0 ? "#fff" : t >= connected(i) + 0.6 ? "#cfe9e6" : "#7d86a8";
        factory(ctx, x, y + (1 - a) * 12 * k, 18 * k, color, l);
    });

    // the questions small manufacturers face
    QUESTIONS.forEach((q, i) => {
        const f = FACTORIES[q.at];
        const a = window01(t, T.challenge + 0.6 + i * 0.7, T.hub + 0.4, 0.4);
        callout(ctx, mapX(f), mapY(f) - 34 * k, q.text, "", k, a * mapAlpha);
    });

    // and what they gain
    BENEFITS.forEach((b, i) => {
        const f = FACTORIES[b.at];
        const a = window01(t, T.transform + 2.2 + i * 0.6, T.outro, 0.4);
        callout(ctx, mapX(f), mapY(f) - 34 * k, b.text, "", k, a * mapAlpha);
    });
    //#endregion

    drawPlatform();
};

const updateDom = (t: number) => {
    const next = sceneAt<Scene>(t, [
        ["intro", 0],
        ["region", T.region],
        ["challenge", T.challenge],
        ["hub", T.hub],
        ["platform", T.platform],
        ["transform", T.transform],
        ["outro", T.outro],
    ]);
    if (scene.value !== next) scene.value = next;
};

useCanvasTimeline(canvas, T.end, draw, { tick: updateDom, done: () => emit("done") });
</script>
