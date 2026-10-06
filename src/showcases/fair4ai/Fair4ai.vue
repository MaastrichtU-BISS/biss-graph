<template>
    <ShowcaseStage ref="stage" :scene="scene" :captions="captions" eyebrow="A BISS project in smart health"
        title="FAIR4AI" tagline="Making AI models practically usable"
        outro="Findable, Accessible, Interoperable and Reusable AI models, starting with healthcare."
        url="fairmodels.org" :partners="['Netherlands eScience Center']" :funders="['NWO']" :members="members" />
</template>
<script setup lang="ts">
import { computed, ref } from "vue";
import ShowcaseStage from "../shared/ShowcaseStage.vue";
import {
    callout,
    ease,
    easeOut,
    fitSize,
    FONT,
    Frame,
    glow,
    lerp,
    MONO,
    mulberry32,
    progress,
    sceneAt,
    text,
    useCanvasTimeline,
    window01,
} from "../shared/anim";

defineProps<{ members: { photo?: string; title: string }[] }>();
const emit = defineEmits<{ done: [] }>();

/** Seconds into the animation at which each part starts. */
const T = { papers: 3.5, describe: 8.5, find: 14, pack: 19.5, validate: 24.5, report: 29.5, outro: 34, credits: 40, end: 46 };

type Scene = "intro" | "papers" | "describe" | "find" | "pack" | "validate" | "report" | "outro" | "credits";
const captions: Record<string, string> = {
    papers: "Many AI models for healthcare are hard to find, run or reuse.",
    describe: "FAIRmodels.org describes each model with standard, machine-readable metadata.",
    find: "So people and software can find a model and access its description.",
    pack: "Each model is packaged in a container with the same REST API, ready to run anywhere.",
    validate: "FAIVOR fetches a model and tests it on a hospital's own data, which never leaves.",
    report: "The validation results go back into the repository, for the next hospital to see.",
};

const stage = ref<InstanceType<typeof ShowcaseStage>>();
const canvas = computed(() => stage.value?.canvas);
const scene = ref<Scene>("intro");

const BLUE = "#6cb8ff";
const GREEN = "#5ee0a0";
const ORANGE = "#ffb347";
const PINK = "#ff7eb6";
const TEAL = "#4dd4c6";
const NAVY = "#0f1530";
const ACCENTS = [BLUE, GREEN, ORANGE, PINK, TEAL];

//#region Content

/** The four principles, lit one by one as the story covers them. */
const FAIR = [
    { letter: "F", word: "Findable", color: BLUE, at: T.find + 2.5 },
    { letter: "A", word: "Accessible", color: TEAL, at: T.find + 3.7 },
    { letter: "I", word: "Interoperable", color: ORANGE, at: T.pack + 3.6 },
    { letter: "R", word: "Reusable", color: GREEN, at: T.report + 1.9 },
];

/** Papers describing models, scattered on a jittered grid (in 0..1 of the safe band). */
const PAPERS = (() => {
    const random = mulberry32(11);
    const out: { x: number; y: number; rot: number; glyph: number; delay: number }[] = [];
    for (let row = 0; row < 3; row++)
        for (let col = 0; col < 6; col++)
            out.push({
                x: 0.12 + col * 0.152 + (random() - 0.5) * 0.04,
                y: 0.19 + row * 0.31 + (random() - 0.5) * 0.03,
                rot: (random() - 0.5) * 0.3,
                glyph: Math.floor(random() * 3),
                delay: random() * 1.2,
            });
    return out;
})();
/** The paper whose model we follow, in the middle row. */
const HERO = 8;
/** Questions a would-be user has, each above a paper in a different row. */
const QUESTIONS = [
    { paper: 1, label: "Which inputs?" },
    { paper: 10, label: "Which version?" },
    { paper: 15, label: "How do I run it?" },
];

/** An illustrative model description, in the shape of the FAIRmodels metadata. */
const FIELDS: [string, string][] = [
    ["Model name", "Example risk model"],
    ["Model type", "Logistic regression"],
    ["Inputs", "age, tumour stage, size"],
    ["Output", "Probability of the outcome"],
    ["Intended use", "Clinical decision support"],
    ["Performance", "AUC, as published"],
    ["License", "Apache-2.0"],
];
const fieldAt = (i: number) => T.describe + 1.7 + i * 0.4;

/** Illustrative models in the repository; index 5 is ours. */
const MODELS = [
    { title: "Survival model", domain: "Cardiology" },
    { title: "Toxicity model", domain: "Oncology" },
    { title: "Image classifier", domain: "Radiology" },
    { title: "Readmission risk", domain: "Internal medicine" },
    { title: "Sepsis alert", domain: "Intensive care" },
    { title: "Example risk model", domain: "Oncology" },
    { title: "Stroke outcome", domain: "Neurology" },
    { title: "Dose prediction", domain: "Oncology" },
    { title: "Kidney function", domain: "Nephrology" },
    { title: "Fracture detector", domain: "Radiology" },
    { title: "Response model", domain: "Oncology" },
    { title: "Heart failure risk", domain: "Cardiology" },
];
const OURS = 5;
const QUERY = "oncology";

/** The model specification `fm-build` turns into a container (values illustrative). */
const SPEC = [
    "{",
    '  "model_type": "logistic_regression",',
    '  "model_uri": "fairmodels.org/instance/…",',
    '  "intercept": -1.2,',
    '  "covariate_weights": { "age": 0.03, … }',
    "}",
];
const COMMAND = "$ fm-build model.json example/risk-model";
const API_CALL = 'curl -H "accept: application/json-ld" fairmodels.org/instance/…';

const SITES = ["Hospital A", "Hospital B", "Hospital C"];

/** Rows of local patient data, as coloured cells. */
const TABLE = (() => {
    const random = mulberry32(5);
    return Array.from({ length: 8 }, () => Array.from({ length: 4 }, () => random()));
})();

//#endregion

//#region Drawing

/** Draws `fn` at `alpha`, so `text()` calls inside can leave their own alpha alone. */
const layer = (ctx: CanvasRenderingContext2D, alpha: number, fn: () => void) => {
    if (alpha <= 0.003) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    fn();
    ctx.restore();
};

const shadow = (ctx: CanvasRenderingContext2D, k: number, on: boolean) => {
    ctx.shadowColor = on ? "rgba(0,0,0,0.35)" : "transparent";
    ctx.shadowBlur = on ? 16 * k : 0;
    ctx.shadowOffsetY = on ? 5 * k : 0;
};

/** A small chart standing for the model inside a paper. */
const glyph = (ctx: CanvasRenderingContext2D, kind: number, x: number, y: number, w: number, h: number) => {
    ctx.save();
    ctx.lineWidth = Math.max(1, h * 0.05);
    ctx.lineCap = "round";
    if (kind === 0) {
        ctx.strokeStyle = BLUE;
        ctx.beginPath();
        for (let i = 0; i <= 20; i++) {
            const f = i / 20;
            const v = 1 / (1 + Math.exp(-(f - 0.5) * 10));
            const px = x + w * 0.1 + f * w * 0.8;
            const py = y + h * 0.85 - v * h * 0.7;
            if (i) ctx.lineTo(px, py);
            else ctx.moveTo(px, py);
        }
        ctx.stroke();
    } else if (kind === 1) {
        ctx.fillStyle = ORANGE;
        [0.4, 0.7, 0.55, 0.85].forEach((v, i) => ctx.fillRect(x + w * (0.14 + i * 0.2), y + h * (0.88 - v * 0.72), w * 0.12, h * v * 0.72));
    } else {
        const nodes = [
            [0.2, 0.3],
            [0.2, 0.7],
            [0.5, 0.2],
            [0.5, 0.5],
            [0.5, 0.8],
            [0.8, 0.5],
        ];
        ctx.strokeStyle = "rgba(255,126,182,0.6)";
        for (const a of [0, 1]) for (const b of [2, 3, 4]) {
            ctx.beginPath();
            ctx.moveTo(x + nodes[a][0] * w, y + nodes[a][1] * h);
            ctx.lineTo(x + nodes[b][0] * w, y + nodes[b][1] * h);
            ctx.stroke();
        }
        for (const b of [2, 3, 4]) {
            ctx.beginPath();
            ctx.moveTo(x + nodes[b][0] * w, y + nodes[b][1] * h);
            ctx.lineTo(x + nodes[5][0] * w, y + nodes[5][1] * h);
            ctx.stroke();
        }
        ctx.fillStyle = PINK;
        nodes.forEach(([nx, ny]) => {
            ctx.beginPath();
            ctx.arc(x + nx * w, y + ny * h, h * 0.08, 0, Math.PI * 2);
            ctx.fill();
        });
    }
    ctx.restore();
};

/** A paper of width `w` centred on (x, y), with a model figure in the middle. */
const paper = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, rot: number, kind: number, k: number, lifted = true) => {
    const h = w * 1.3;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    // a shadow under a half-transparent page reads as grey, so only settled pages get one
    shadow(ctx, k, lifted);
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, w * 0.05);
    ctx.fill();
    shadow(ctx, k, false);
    ctx.fillStyle = "#1f2937";
    ctx.fillRect(-w * 0.36, -h * 0.4, w * 0.6, h * 0.035);
    ctx.fillStyle = "#d1d5db";
    for (let i = 0; i < 4; i++) ctx.fillRect(-w * 0.36, -h * 0.31 + i * h * 0.055, w * (i === 3 ? 0.45 : 0.72), h * 0.022);
    ctx.fillStyle = "#f1f5f9";
    ctx.fillRect(-w * 0.36, -h * 0.07, w * 0.72, h * 0.3);
    glyph(ctx, kind, -w * 0.36, -h * 0.07, w * 0.72, h * 0.3);
    ctx.fillStyle = "#d1d5db";
    for (let i = 0; i < 3; i++) ctx.fillRect(-w * 0.36, h * 0.3 + i * h * 0.055, w * (i === 2 ? 0.5 : 0.72), h * 0.022);
    ctx.restore();
};

/** A teal shipping-container box of size w×h centred on (x, y), with API ports on both sides. */
const container = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, k: number, label: string, busy = 0, t = 0) => {
    const s = h / 160;
    shadow(ctx, k, true);
    ctx.fillStyle = TEAL;
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y - h / 2, w, h, 10 * s);
    ctx.fill();
    shadow(ctx, k, false);
    // ribs, which ripple while the model is running
    const ribs = 9;
    for (let i = 1; i < ribs; i++) {
        const lit = busy * (0.5 + 0.5 * Math.sin(t * 8 - i));
        ctx.fillStyle = `rgba(6,9,20,${0.16 - lit * 0.1})`;
        ctx.fillRect(x - w / 2 + (i * w) / ribs - 2.5 * s, y - h * 0.38, 5 * s, h * 0.76);
    }
    // the same API port on both sides: data in, prediction out
    ctx.fillStyle = "#fff";
    for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.roundRect(x + side * w / 2 - 9 * s, y - 16 * s, 18 * s, 32 * s, 5 * s);
        ctx.fill();
    }
    if (label && h > 40 * k) {
        const pw = w * 0.66;
        const ph = h * 0.32;
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.roundRect(x - pw / 2, y - ph / 2, pw, ph, 6 * s);
        ctx.fill();
        text(ctx, label, x, y + 1 * s, ph * 0.46, { color: NAVY, weight: 700, maxWidth: pw * 0.86 });
    }
};

const tick = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number) => {
    ctx.fillStyle = GREEN;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#06201d";
    ctx.lineWidth = r * 0.22;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x - r * 0.45, y);
    ctx.lineTo(x - r * 0.1, y + r * 0.35);
    ctx.lineTo(x + r * 0.45, y - r * 0.35);
    ctx.stroke();
};

const lock = (ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) => {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = s * 0.18;
    ctx.beginPath();
    ctx.arc(x, y - s * 0.15, s * 0.32, Math.PI, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(x - s * 0.5, y - s * 0.15, s, s * 0.75, s * 0.12);
    ctx.fill();
};

/** A model's card in the repository. */
const miniCard = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, k: number, m: (typeof MODELS)[number], ours: boolean) => {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y - h / 2, w, h, 8 * k);
    ctx.fill();
    ctx.fillStyle = ours ? BLUE : "#cbd5e1";
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y - h / 2, 7 * k, h, [8 * k, 0, 0, 8 * k]);
    ctx.fill();
    text(ctx, m.title, x - w / 2 + 22 * k, y - h * 0.15, 19 * k, { align: "left", color: "#000", maxWidth: w - 36 * k });
    text(ctx, m.domain, x - w / 2 + 22 * k, y + h * 0.2, 15 * k, { align: "left", color: "#4b4b4b", weight: 500, maxWidth: w - 36 * k });
};

/** A point along a quadratic curve. */
const quad = (a: { x: number; y: number }, c: { x: number; y: number }, b: { x: number; y: number }, f: number) => ({
    x: (1 - f) * (1 - f) * a.x + 2 * (1 - f) * f * c.x + f * f * b.x,
    y: (1 - f) * (1 - f) * a.y + 2 * (1 - f) * f * c.y + f * f * b.y,
});

//#endregion

const draw = ({ ctx, t, W, k, safe }: Frame) => {
    const span = safe.bottom - safe.top;
    const cx = W / 2;
    // below the row of FAIR principles
    const cTop = safe.top + 92 * k;
    const cBot = safe.bottom - 8 * k;
    const cy = (cTop + cBot) / 2;
    const out = 1 - progress(t, T.outro, T.outro + 0.9);

    //#region the scattered papers, and the one we follow
    const paperW = 92 * k;
    const paperAt = (i: number) => ({
        x: W * PAPERS[i].x + Math.sin(t * 0.4 + i) * 8 * k,
        y: safe.top + span * PAPERS[i].y + Math.cos(t * 0.35 + i * 1.7) * 6 * k,
    });
    const heroMove = ease(progress(t, T.describe, T.describe + 1.2));
    const hero = (() => {
        const p = paperAt(HERO);
        return {
            x: lerp(p.x, W * 0.28, heroMove),
            y: lerp(p.y, cy, heroMove),
            w: lerp(paperW, paperW * 2, heroMove),
            rot: lerp(PAPERS[HERO].rot, 0, heroMove),
        };
    })();

    if (t >= T.papers && t < T.find + 0.5) {
        const scatter = progress(t, T.describe, T.describe + 0.9);
        PAPERS.forEach((p, i) => {
            if (i === HERO) return;
            const appear = easeOut(progress(t, T.papers + 0.5 + p.delay, T.papers + 1 + p.delay));
            const pos = paperAt(i);
            // the others drift outwards and away once we pick one
            const dx = pos.x - cx;
            const dy = pos.y - (safe.top + span / 2);
            const d = Math.hypot(dx, dy) || 1;
            const shrink = (0.8 + 0.2 * appear) * (1 - 0.4 * easeOut(progress(scatter, 0, 0.3)));
            const alpha = progress(appear, 0, 0.25) * (1 - progress(scatter, 0, 0.3));
            layer(ctx, alpha, () =>
                paper(ctx, pos.x + (dx / d) * 80 * k * ease(scatter), pos.y + (dy / d) * 80 * k * ease(scatter) + (1 - appear) * 24 * k, paperW * shrink, p.rot, p.glyph, k, alpha > 0.97)
            );
        });
        const heroIn = easeOut(progress(t, T.papers + 0.5 + PAPERS[HERO].delay, T.papers + 1 + PAPERS[HERO].delay));
        const heroOut = progress(t, T.find - 0.1, T.find + 0.5);
        if (heroMove > 0) glow(ctx, hero.x, hero.y, hero.w * 1.4, BLUE, 0.35 * heroMove * (1 - heroOut));
        layer(ctx, heroIn * (1 - heroOut), () => paper(ctx, hero.x, hero.y + (1 - heroIn) * 24 * k, hero.w, hero.rot, PAPERS[HERO].glyph, k, heroIn * (1 - heroOut) > 0.97));

        // reading the paper: a scan line sweeps down while the fields are filled
        const scan = progress(t, fieldAt(0) - 0.6, fieldAt(FIELDS.length - 1));
        if (scan > 0 && scan < 1) {
            const h = hero.w * 1.3;
            const y = hero.y - h * 0.44 + scan * h * 0.88;
            layer(ctx, window01(scan, 0, 1, 0.08), () => {
                glow(ctx, hero.x, y, hero.w * 0.5, BLUE, 0.5);
                ctx.fillStyle = BLUE;
                ctx.fillRect(hero.x - hero.w * 0.46, y - 1.5 * k, hero.w * 0.92, 3 * k);
            });
        }

        QUESTIONS.forEach((q, i) => {
            const p = paperAt(q.paper);
            const a = window01(t, T.papers + 2 + i * 0.6, T.describe + 0.2, 0.4);
            callout(ctx, p.x, p.y - paperW * 0.68, q.label, "", k, a);
        });
    }
    //#endregion

    //#region the metadata card, filled from the paper
    const cardW = Math.min(W * 0.4, 640 * k);
    const cardX = W * 0.44;
    const headH = 70 * k;
    const rowH = 50 * k;
    const cardH = headH + FIELDS.length * rowH + 14 * k;
    const cardCX = cardX + cardW / 2;

    // the grid of the repository, which the card joins
    const miniW = Math.min(232 * k, (W * 0.86 - 3 * 22 * k) / 4);
    const miniH = 86 * k;
    const gap = 22 * k;
    const gridW = miniW * 4 + gap * 3;
    const blockTop = cy - 228 * k;
    const searchY = blockTop + 28 * k;
    const gridTop = blockTop + 84 * k;
    const apiY = gridTop + miniH * 3 + gap * 2 + 46 * k;
    const slot = (i: number) => ({
        x: cx - gridW / 2 + miniW / 2 + (i % 4) * (miniW + gap),
        y: gridTop + miniH / 2 + Math.floor(i / 4) * (miniH + gap),
    });

    const toGrid = ease(progress(t, T.find, T.find + 1.1));
    const cardIn = easeOut(progress(t, T.describe + 0.7, T.describe + 1.3));
    if (cardIn > 0 && toGrid < 1) {
        const target = slot(OURS);
        // pops in quickly, so the white card never lingers half-transparent
        const scale = lerp(1, miniW / cardW, toGrid) * (0.92 + 0.08 * cardIn);
        const x = lerp(cardCX, target.x, toGrid) + (1 - cardIn) * 40 * k;
        const y = lerp(cy, target.y, toGrid);
        layer(ctx, progress(cardIn, 0, 0.45) * (1 - progress(toGrid, 0.5, 0.9)), () => {
            ctx.translate(x, y);
            ctx.scale(scale, scale);
            ctx.translate(-cardW / 2, -cardH / 2);
            shadow(ctx, k, true);
            ctx.fillStyle = "#fff";
            ctx.beginPath();
            ctx.roundRect(0, 0, cardW, cardH, 10 * k);
            ctx.fill();
            shadow(ctx, k, false);
            ctx.fillStyle = BLUE;
            ctx.beginPath();
            ctx.roundRect(0, 0, cardW, 6 * k, [10 * k, 10 * k, 0, 0]);
            ctx.fill();
            text(ctx, "Model metadata", 28 * k, headH * 0.55, 24 * k, { align: "left", color: "#000", weight: 700, maxWidth: cardW * 0.5 });
            // a CEDAR template defines the fields before anything is filled in
            ctx.font = `600 ${15 * k}px ${FONT}`;
            const chipW = ctx.measureText("CEDAR template").width + 24 * k;
            ctx.fillStyle = "#e8eefc";
            ctx.beginPath();
            ctx.roundRect(cardW - 24 * k - chipW, headH * 0.55 - 15 * k, chipW, 30 * k, 15 * k);
            ctx.fill();
            text(ctx, "CEDAR template", cardW - 24 * k - chipW / 2, headH * 0.55, 15 * k, { color: "#2f5aa8", maxWidth: chipW });
            FIELDS.forEach(([label, value], i) => {
                const ry = headH + i * rowH + rowH / 2;
                ctx.fillStyle = "#e5e7eb";
                ctx.fillRect(24 * k, headH + i * rowH, cardW - 48 * k, 1.5 * k);
                text(ctx, label, 28 * k, ry, 17 * k, { align: "left", color: "#6b7280", weight: 500, maxWidth: cardW * 0.32 });
                const reveal = easeOut(progress(t, fieldAt(i), fieldAt(i) + 0.35));
                if (reveal <= 0) {
                    // an empty slot waiting for its value
                    ctx.fillStyle = "#f1f5f9";
                    ctx.beginPath();
                    ctx.roundRect(cardW * 0.38, ry - 11 * k, cardW * 0.4, 22 * k, 4 * k);
                    ctx.fill();
                    return;
                }
                ctx.save();
                ctx.beginPath();
                ctx.rect(cardW * 0.38 - 4 * k, ry - rowH / 2, (cardW * 0.6 + 8 * k) * reveal, rowH);
                ctx.clip();
                text(ctx, value, cardW * 0.38, ry, 19 * k, { align: "left", color: "#000", maxWidth: cardW * 0.58 });
                ctx.restore();
                // a brief flash as the value lands
                const flash = 1 - progress(t, fieldAt(i), fieldAt(i) + 0.6);
                if (flash > 0 && flash < 1) {
                    ctx.save();
                    ctx.globalAlpha *= flash * 0.25;
                    ctx.fillStyle = ACCENTS[i % ACCENTS.length];
                    ctx.fillRect(cardW * 0.38 - 8 * k, ry - rowH * 0.4, cardW * 0.6, rowH * 0.8);
                    ctx.restore();
                }
            });
        });

        // facts lifted from the paper fly into the template
        if (toGrid <= 0)
            FIELDS.forEach((_, i) => {
                const random = mulberry32(100 + i);
                const h = hero.w * 1.3;
                for (let j = 0; j < 4; j++) {
                    const start = fieldAt(i) - 0.55 + j * 0.05;
                    const f = progress(t, start, start + 0.5);
                    if (f <= 0 || f >= 1) continue;
                    const a = { x: hero.x + (random() - 0.5) * hero.w * 0.6, y: hero.y + (random() - 0.5) * h * 0.7 };
                    const b = { x: cardX + cardW * 0.4, y: cy - cardH / 2 + headH + i * rowH + rowH / 2 };
                    const p = quad(a, { x: (a.x + b.x) / 2, y: Math.min(a.y, b.y) - 90 * k }, b, ease(f));
                    const color = ACCENTS[i % ACCENTS.length];
                    layer(ctx, 1, () => {
                        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 16 * k);
                        g.addColorStop(0, color + "aa");
                        g.addColorStop(1, color + "00");
                        ctx.fillStyle = g;
                        ctx.fillRect(p.x - 16 * k, p.y - 16 * k, 32 * k, 32 * k);
                        ctx.fillStyle = color;
                        ctx.beginPath();
                        ctx.arc(p.x, p.y, 4.5 * k, 0, Math.PI * 2);
                        ctx.fill();
                    });
                }
            });

        // the result is machine-readable as well as human-readable
        const chips = ["JSON-LD", "Machine-readable", "Human-readable"];
        ctx.font = `600 ${17 * k}px ${FONT}`;
        const widths = chips.map((c) => ctx.measureText(c).width + 30 * k);
        const total = widths.reduce((a, b) => a + b, 0) + 12 * k * (chips.length - 1);
        let left = cardCX - total / 2;
        chips.forEach((c, i) => {
            const f = easeOut(progress(t, fieldAt(FIELDS.length - 1) + 0.4 + i * 0.15, fieldAt(FIELDS.length - 1) + 0.8 + i * 0.15));
            const x = left + widths[i] / 2;
            left += widths[i] + 12 * k;
            const y = cy + cardH / 2 + 34 * k + (1 - f) * 12 * k;
            layer(ctx, f * (1 - progress(t, T.find - 0.2, T.find + 0.3)), () => {
                ctx.fillStyle = i === 0 ? GREEN : "rgba(255,255,255,0.12)";
                ctx.beginPath();
                ctx.roundRect(x - widths[i] / 2, y - 16 * k, widths[i], 32 * k, 16 * k);
                ctx.fill();
                text(ctx, c, x, y, 17 * k, { color: i === 0 ? "#06201d" : "#fff" });
            });
        });
    }
    //#endregion

    //#region the repository: search by people, access by machines
    const packMove = ease(progress(t, T.pack, T.pack + 0.9));
    const gridFade = 1 - progress(t, T.pack, T.pack + 0.6);
    if (t >= T.find && t < T.pack + 1) {
        const typed = QUERY.slice(0, Math.floor(progress(t, T.find + 1.4, T.find + 2.1) * QUERY.length));
        const searched = ease(progress(t, T.find + 2.3, T.find + 2.8));

        // search bar
        const bar = easeOut(progress(t, T.find + 0.8, T.find + 1.3)) * gridFade;
        layer(ctx, bar, () => {
            ctx.fillStyle = "rgba(255,255,255,0.1)";
            ctx.strokeStyle = "rgba(255,255,255,0.25)";
            ctx.lineWidth = 1.5 * k;
            ctx.beginPath();
            ctx.roundRect(cx - gridW / 2, searchY - 27 * k, gridW, 54 * k, 27 * k);
            ctx.fill();
            ctx.stroke();
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 2.5 * k;
            ctx.beginPath();
            ctx.arc(cx - gridW / 2 + 32 * k, searchY - 3 * k, 9 * k, 0, Math.PI * 2);
            ctx.moveTo(cx - gridW / 2 + 38.5 * k, searchY + 3.5 * k);
            ctx.lineTo(cx - gridW / 2 + 45 * k, searchY + 10 * k);
            ctx.stroke();
            const tx = cx - gridW / 2 + 62 * k;
            if (typed) {
                text(ctx, typed, tx, searchY, 21 * k, { align: "left", weight: 500 });
                ctx.font = `500 ${21 * k}px ${FONT}`;
                const cw = ctx.measureText(typed).width;
                if (searched <= 0 && Math.floor(t * 2.5) % 2 === 0) ctx.fillRect(tx + cw + 3 * k, searchY - 12 * k, 2 * k, 24 * k);
            } else {
                text(ctx, "Search models", tx, searchY, 21 * k, { align: "left", weight: 500, color: "rgba(255,255,255,0.45)" });
            }
            const matches = MODELS.filter((m) => m.domain.toLowerCase() === QUERY).length;
            text(ctx, `${matches} models`, cx + gridW / 2 - 28 * k, searchY, 17 * k, { align: "right", weight: 500, color: "rgba(255,255,255,0.7)", alpha: searched });
        });

        MODELS.forEach((m, i) => {
            const p = slot(i);
            if (i === OURS) {
                const ours = progress(toGrid, 0.5, 0.9);
                if (ours <= 0) return;
                const x = lerp(p.x, cx, packMove);
                const y = lerp(p.y, cy - 160 * k, packMove);
                glow(ctx, x, y, miniW * 0.8, BLUE, 0.45 * searched * (1 - packMove));
                layer(ctx, ours * (1 - progress(packMove, 0.4, 0.9)), () => {
                    miniCard(ctx, x, y, miniW, miniH, k, m, true);
                    if (searched > 0) {
                        ctx.globalAlpha *= searched;
                        ctx.strokeStyle = BLUE;
                        ctx.lineWidth = 3 * k;
                        ctx.beginPath();
                        ctx.roundRect(x - miniW / 2 - 4 * k, y - miniH / 2 - 4 * k, miniW + 8 * k, miniH + 8 * k, 10 * k);
                        ctx.stroke();
                    }
                });
                return;
            }
            const f = easeOut(progress(t, T.find + 0.4 + i * 0.05, T.find + 0.9 + i * 0.05));
            const match = m.domain.toLowerCase() === QUERY;
            const dim = match ? 1 : 1 - searched * 0.72;
            layer(ctx, f * dim * gridFade, () => {
                miniCard(ctx, p.x, p.y + (1 - f) * 16 * k, miniW, miniH, k, m, false);
                if (match && searched > 0) {
                    ctx.globalAlpha *= searched * 0.8;
                    ctx.strokeStyle = BLUE;
                    ctx.lineWidth = 2 * k;
                    ctx.beginPath();
                    ctx.roundRect(p.x - miniW / 2 - 4 * k, p.y - miniH / 2 - 4 * k, miniW + 8 * k, miniH + 8 * k, 10 * k);
                    ctx.stroke();
                }
            });
        });

        // the same descriptions, fetched by software
        const api = easeOut(progress(t, T.find + 3, T.find + 3.4)) * gridFade;
        layer(ctx, api, () => {
            const w = gridW;
            ctx.fillStyle = NAVY;
            ctx.strokeStyle = "rgba(255,255,255,0.18)";
            ctx.lineWidth = 1.5 * k;
            ctx.beginPath();
            ctx.roundRect(cx - w / 2, apiY - 26 * k, w, 52 * k, 8 * k);
            ctx.fill();
            ctx.stroke();
            const shown = API_CALL.slice(0, Math.floor(progress(t, T.find + 3.1, T.find + 3.9) * API_CALL.length));
            const size = fitSize(ctx, API_CALL + "   → JSON-LD", w - 48 * k, 19 * k, 500, MONO);
            text(ctx, shown, cx - w / 2 + 24 * k, apiY, size, { align: "left", weight: 500, font: MONO, color: "#9fb6ff" });
            ctx.font = `500 ${size}px ${MONO}`;
            const back = progress(t, T.find + 4, T.find + 4.4);
            text(ctx, "→ JSON-LD", cx - w / 2 + 24 * k + ctx.measureText(API_CALL + "   ").width, apiY, size, { align: "left", weight: 700, font: MONO, color: GREEN, alpha: back });
        });
    }
    //#endregion

    //#region packaging: one container, one API
    const codeW = Math.min(W * 0.5, 640 * k);
    const codeLineH = 34 * k;
    const codeH = SPEC.length * codeLineH + 36 * k;
    const codeY = cy + 30 * k;
    const wrap = ease(progress(t, T.pack + 2.3, T.pack + 3.1));
    const boxW = 300 * k;
    const boxH = 160 * k;

    // the validation layout, where the container goes next
    const rw = 300 * k;
    const rcx = W * 0.05 + rw / 2;
    const zx0 = W * 0.05 + rw + 110 * k;
    const zx1 = W * 0.95;
    const zTop = cTop + 6 * k;
    const zBot = cBot - 6 * k;
    const tableX = zx0 + 150 * k;
    const ccx = zx0 + 440 * k;
    const plot = Math.min(250 * k, (zBot - zTop) * 0.5);
    const plotX = zx0 + 640 * k;
    const plotY = cy - plot / 2 + 10 * k;
    const repoTop = cy - 130 * k;
    const iconAt = { x: rcx + rw / 2 - 42 * k, y: repoTop + 34 * k };

    const toRepo = ease(progress(t, T.validate, T.validate + 1));
    if (t >= T.pack && t < T.validate + 1.2) {
        // the specification, then the build
        const codeIn = progress(packMove, 0.4, 1);
        layer(ctx, codeIn * (1 - wrap), () => {
            const s = lerp(1, boxW / codeW, wrap);
            ctx.translate(cx, lerp(codeY, cy, wrap));
            ctx.scale(s, lerp(1, boxH / codeH, wrap));
            ctx.translate(-codeW / 2, -codeH / 2);
            ctx.fillStyle = NAVY;
            ctx.strokeStyle = "rgba(255,255,255,0.18)";
            ctx.lineWidth = 1.5 * k;
            ctx.beginPath();
            ctx.roundRect(0, 0, codeW, codeH, 10 * k);
            ctx.fill();
            ctx.stroke();
            const size = fitSize(ctx, SPEC[4], codeW - 48 * k, 20 * k, 500, MONO);
            ctx.font = `500 ${size}px ${MONO}`;
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
            SPEC.forEach((line, i) => {
                const colon = line.indexOf(":");
                const y = 18 * k + codeLineH * (i + 0.5);
                ctx.fillStyle = colon < 0 ? "#e6e9f5" : "#9fb6ff";
                ctx.fillText(colon < 0 ? line : line.slice(0, colon + 1), 24 * k, y);
                if (colon >= 0) {
                    ctx.fillStyle = GREEN;
                    ctx.fillText(line.slice(colon + 1), 24 * k + ctx.measureText(line.slice(0, colon + 1)).width, y);
                }
            });
        });
        text(ctx, "model.json", cx - codeW / 2, codeY - codeH / 2 - 22 * k, 17 * k, {
            align: "left",
            weight: 500,
            color: "rgba(255,255,255,0.6)",
            alpha: codeIn * (1 - progress(t, T.pack + 1, T.pack + 1.3)),
        });

        // the build command
        const cmd = window01(t, T.pack + 1.3, T.pack + 3.1, 0.3);
        layer(ctx, cmd, () => {
            const shown = COMMAND.slice(0, Math.floor(progress(t, T.pack + 1.4, T.pack + 2.2) * COMMAND.length));
            const size = fitSize(ctx, COMMAND, codeW, 22 * k, 600, MONO);
            text(ctx, shown, cx - codeW / 2, codeY - codeH / 2 - 26 * k, size, { align: "left", font: MONO, color: "#fff" });
        });

        // the container: built, run, then published and fetched
        if (wrap > 0) {
            const pop = 0.85 + 0.15 * easeOut(wrap);
            const w = lerp(boxW * pop, 46 * k, toRepo);
            const h = lerp(boxH * pop, 30 * k, toRepo);
            const x = lerp(cx, iconAt.x, toRepo);
            const y = lerp(cy, iconAt.y, toRepo) - Math.sin(toRepo * Math.PI) * 60 * k;
            glow(ctx, x, y, w * 0.9, TEAL, 0.35 * wrap * (1 - toRepo));
            const running = window01(t, T.pack + 3.2, T.validate, 0.3);
            layer(ctx, progress(wrap, 0, 0.5), () => container(ctx, x, y, w, h, k, "Example risk model", running, t));

            const labels = window01(t, T.pack + 3.2, T.validate + 0.2, 0.4);
            text(ctx, "Same REST API for every model", cx, cy - boxH / 2 - 36 * k, 21 * k, { color: "rgba(255,255,255,0.8)", weight: 500, alpha: labels });
            text(ctx, "Data in", cx - 420 * k, cy - 48 * k, 18 * k, { color: "rgba(255,255,255,0.6)", weight: 500, alpha: labels });
            text(ctx, "Prediction out", cx + 420 * k, cy - 48 * k, 18 * k, { color: "rgba(255,255,255,0.6)", weight: 500, alpha: labels });
            // requests through the API, on a loop
            if (labels > 0) {
                const cycle = 1.6;
                const phase = ((t - (T.pack + 3.2)) % cycle) / cycle;
                const inF = ease(progress(phase, 0, 0.45));
                const outF = ease(progress(phase, 0.5, 0.95));
                const chip = (label: string, x: number, alpha: number, color: string) => {
                    ctx.font = `500 ${17 * k}px ${MONO}`;
                    const cw = ctx.measureText(label).width + 28 * k;
                    layer(ctx, alpha * labels, () => {
                        ctx.fillStyle = NAVY;
                        ctx.strokeStyle = color;
                        ctx.lineWidth = 1.5 * k;
                        ctx.beginPath();
                        ctx.roundRect(x - cw / 2, cy - 18 * k, cw, 36 * k, 8 * k);
                        ctx.fill();
                        ctx.stroke();
                        text(ctx, label, x, cy, 17 * k, { font: MONO, weight: 500, color });
                    });
                };
                chip("{ age, stage, size }", lerp(cx - 420 * k, cx - boxW / 2 - 40 * k, inF), 1 - progress(inF, 0.7, 1), "#9fb6ff");
                chip("risk: 0.27", lerp(cx + boxW / 2 + 40 * k, cx + 420 * k, outF), progress(outF, 0, 0.25), GREEN);
            }
        }
    }
    //#endregion

    //#region validating at a hospital, and reporting back
    if (t >= T.validate) {
        const v = T.validate;
        const r = T.report;
        const scene = easeOut(progress(t, v + 0.2, v + 0.6)) * out;

        // the repository, with our model's card
        const badges = SITES.map((_, i) => easeOut(progress(t, r + 1.8 + i * 0.55, r + 2.2 + i * 0.55)));
        const badgeH = 40 * k;
        const repoH = 92 * k + badges.reduce((a, b) => a + b, 0) * badgeH + (badges[0] > 0 ? 10 * k * badges[0] : 0);
        layer(ctx, scene, () => {
            text(ctx, "FAIRmodels.org", rcx, repoTop - 40 * k, 22 * k, { weight: 700, maxWidth: rw });
            // more models behind ours
            for (const n of [2, 1]) {
                ctx.fillStyle = `rgba(255,255,255,${0.1 + (2 - n) * 0.08})`;
                ctx.beginPath();
                ctx.roundRect(rcx - rw / 2 + n * 10 * k, repoTop - n * 10 * k, rw, 92 * k, 8 * k);
                ctx.fill();
            }
            shadow(ctx, k, true);
            ctx.fillStyle = "#fff";
            ctx.beginPath();
            ctx.roundRect(rcx - rw / 2, repoTop, rw, repoH, 8 * k);
            ctx.fill();
            shadow(ctx, k, false);
            ctx.fillStyle = BLUE;
            ctx.beginPath();
            ctx.roundRect(rcx - rw / 2, repoTop, 7 * k, repoH, [8 * k, 0, 0, 8 * k]);
            ctx.fill();
            text(ctx, MODELS[OURS].title, rcx - rw / 2 + 24 * k, repoTop + 34 * k, 19 * k, { align: "left", color: "#000", maxWidth: rw - 100 * k });
            text(ctx, "Oncology, logistic regression", rcx - rw / 2 + 24 * k, repoTop + 62 * k, 15 * k, { align: "left", color: "#4b4b4b", weight: 500, maxWidth: rw - 40 * k });
            badges.forEach((b, i) => {
                if (b <= 0) return;
                const y = repoTop + 92 * k + i * badgeH + badgeH / 2;
                layer(ctx, b, () => {
                    ctx.fillStyle = "#e9faf2";
                    ctx.beginPath();
                    ctx.roundRect(rcx - rw / 2 + 18 * k, y - badgeH * 0.42 + (1 - b) * 8 * k, rw - 36 * k, badgeH * 0.84, 6 * k);
                    ctx.fill();
                    tick(ctx, rcx - rw / 2 + 36 * k, y + (1 - b) * 8 * k, 10 * k);
                    text(ctx, `Validated at ${SITES[i]}`, rcx - rw / 2 + 56 * k, y + (1 - b) * 8 * k, 16 * k, { align: "left", color: "#0b3d2a", maxWidth: rw - 84 * k });
                });
            });
        });
        // the published container stays on the card
        if (toRepo >= 1) layer(ctx, out, () => container(ctx, iconAt.x, iconAt.y, 46 * k, 30 * k, k, ""));
        const validated = progress(t, r + 1.8, r + 2.4);
        glow(ctx, rcx, repoTop + repoH / 2, rw * 0.9, GREEN, 0.3 * validated * out);

        // the hospital, where the data stays
        layer(ctx, scene, () => {
            ctx.fillStyle = "rgba(77,212,198,0.05)";
            ctx.strokeStyle = "rgba(77,212,198,0.55)";
            ctx.lineWidth = 2 * k;
            ctx.setLineDash([10 * k, 7 * k]);
            ctx.beginPath();
            ctx.roundRect(zx0, zTop, zx1 - zx0, zBot - zTop, 14 * k);
            ctx.fill();
            ctx.stroke();
            ctx.setLineDash([]);
            text(ctx, "FAIVOR runs inside the hospital", zx0 + 28 * k, zTop + 34 * k, 20 * k, { align: "left", maxWidth: (zx1 - zx0) * 0.5 });
            ctx.font = `600 ${18 * k}px ${FONT}`;
            const lw = ctx.measureText("Patient data stays here").width;
            lock(ctx, zx1 - 40 * k - lw, zTop + 34 * k, 18 * k, TEAL);
            text(ctx, "Patient data stays here", zx1 - 24 * k, zTop + 34 * k, 18 * k, { align: "right", color: TEAL, maxWidth: (zx1 - zx0) * 0.4 });

            // local data
            const cell = 34 * k;
            const rowY = (i: number) => cy - (TABLE.length * 24 * k) / 2 + i * 24 * k + 12 * k;
            text(ctx, "Local data", tableX, rowY(0) - 40 * k, 17 * k, { weight: 500, color: "rgba(255,255,255,0.7)" });
            TABLE.forEach((row, i) => {
                row.forEach((value, j) => {
                    ctx.fillStyle = j === 0 ? "rgba(255,255,255,0.75)" : `rgba(108,184,255,${0.25 + value * 0.6})`;
                    ctx.beginPath();
                    ctx.roundRect(tableX - (cell * 4 + 6 * k * 3) / 2 + j * (cell + 6 * k), rowY(i) - 9 * k, cell, 18 * k, 3 * k);
                    ctx.fill();
                });
            });
        });

        // FAIVOR fetches the model from the repository
        const fetchLine = progress(t, v + 0.9, v + 1.4);
        const fetch = ease(progress(t, v + 1.1, v + 2.1));
        layer(ctx, fetchLine * out, () => {
            const a = rcx + rw / 2 + 16 * k;
            const b = zx0 - 14 * k;
            ctx.strokeStyle = "rgba(255,255,255,0.5)";
            ctx.lineWidth = 2 * k;
            ctx.setLineDash([8 * k, 6 * k]);
            ctx.beginPath();
            ctx.moveTo(a, cy);
            ctx.lineTo(lerp(a, b, fetchLine), cy);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = "rgba(255,255,255,0.7)";
            ctx.beginPath();
            ctx.moveTo(b + 2 * k, cy);
            ctx.lineTo(b - 9 * k, cy - 7 * k);
            ctx.lineTo(b - 9 * k, cy + 7 * k);
            ctx.fill();
            const chip = Math.min(84 * k, b - a - 8 * k);
            ctx.fillStyle = "#fff";
            ctx.beginPath();
            ctx.roundRect((a + b) / 2 - chip / 2, cy - 15 * k, chip, 30 * k, 15 * k);
            ctx.fill();
            text(ctx, "FAIVOR", (a + b) / 2, cy, 15 * k, { color: NAVY, weight: 700, maxWidth: chip - 12 * k });
        });
        if (fetch > 0) {
            const a = iconAt;
            const b = { x: ccx, y: cy };
            const p = quad(a, { x: (a.x + b.x) / 2, y: cy - 230 * k }, b, fetch);
            const busy = window01(t, v + 2.2, r + 0.6, 0.3);
            glow(ctx, p.x, p.y, 160 * k * fetch, TEAL, 0.3 * out);
            layer(ctx, out, () => container(ctx, p.x, p.y, lerp(46 * k, 220 * k, fetch), lerp(30 * k, 118 * k, fetch), k, "Example risk model", busy, t));
        }

        // patient rows run through the model, which never sends them anywhere
        const stream = window01(t, v + 2.1, r + 0.6, 0.4) * out;
        if (stream > 0) {
            for (let j = 0; j < 10; j++) {
                const phase = ((t - v) * 0.9 + j / 10) % 1;
                const a = { x: tableX + 80 * k, y: cy + (((j * 37) % 8) - 3.5) * 24 * k };
                const b = { x: ccx - 112 * k, y: cy };
                const p = { x: lerp(a.x, b.x, ease(phase)), y: lerp(a.y, b.y, ease(phase)) };
                layer(ctx, stream * window01(phase, 0, 1, 0.15), () => {
                    ctx.fillStyle = BLUE;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, 4 * k, 0, Math.PI * 2);
                    ctx.fill();
                });
                const q = { x: lerp(ccx + 112 * k, plotX - 10 * k, ease(phase)), y: lerp(cy, plotY + plot * (0.2 + ((j * 53) % 10) / 16), ease(phase)) };
                layer(ctx, stream * window01(phase, 0, 1, 0.15) * progress(t, v + 2.5, v + 2.9), () => {
                    ctx.fillStyle = GREEN;
                    ctx.beginPath();
                    ctx.arc(q.x, q.y, 3.5 * k, 0, Math.PI * 2);
                    ctx.fill();
                });
            }
        }

        // results: a ROC curve and the usual metrics (values illustrative)
        const resultsIn = easeOut(progress(t, v + 2.4, v + 2.75));
        const results = progress(resultsIn, 0, 0.6) * out;
        layer(ctx, results, () => {
            // pops in rather than fading through grey
            const pop = 0.9 + 0.1 * resultsIn;
            ctx.translate(plotX + plot / 2, plotY + plot / 2);
            ctx.scale(pop, pop);
            ctx.translate(-(plotX + plot / 2), -(plotY + plot / 2));
            ctx.fillStyle = "#fff";
            ctx.beginPath();
            ctx.roundRect(plotX - 14 * k, plotY - 46 * k, plot + 28 * k, plot + 60 * k, 8 * k);
            ctx.fill();
            text(ctx, "ROC curve", plotX, plotY - 24 * k, 16 * k, { align: "left", color: "#000", maxWidth: plot });
            ctx.strokeStyle = "#cbd5e1";
            ctx.lineWidth = 1.5 * k;
            ctx.strokeRect(plotX, plotY, plot, plot);
            ctx.setLineDash([5 * k, 5 * k]);
            ctx.beginPath();
            ctx.moveTo(plotX, plotY + plot);
            ctx.lineTo(plotX + plot, plotY);
            ctx.stroke();
            ctx.setLineDash([]);
            const drawn = ease(progress(t, v + 2.8, v + 4.2));
            ctx.strokeStyle = BLUE;
            ctx.lineWidth = 3.5 * k;
            ctx.lineJoin = "round";
            ctx.beginPath();
            const steps = Math.round(40 * drawn);
            for (let i = 0; i <= steps; i++) {
                const f = i / 40;
                const y = Math.pow(f, 0.32);
                const px = plotX + f * plot;
                const py = plotY + plot - y * plot;
                if (i) ctx.lineTo(px, py);
                else ctx.moveTo(px, py);
            }
            ctx.stroke();
        });
        const mx = plotX + plot + 46 * k;
        const mw = zx1 - 28 * k - mx;
        const METRICS = [
            { label: "AUC", value: 0.78 * ease(progress(t, v + 3, v + 4.2)), digits: 2 },
            { label: "Brier score", value: 0.17 * ease(progress(t, v + 3.3, v + 4.4)), digits: 2 },
            { label: "Calibration slope", value: 0.94 * ease(progress(t, v + 3.6, v + 4.6)), digits: 2 },
        ];
        METRICS.forEach((m, i) => {
            const f = easeOut(progress(t, v + 2.9 + i * 0.3, v + 3.4 + i * 0.3)) * out;
            const y = plotY + 20 * k + i * 82 * k;
            layer(ctx, f, () => {
                text(ctx, m.label, mx, y, 17 * k, { align: "left", weight: 500, color: "rgba(255,255,255,0.65)", maxWidth: mw });
                text(ctx, m.value.toFixed(m.digits), mx, y + 34 * k, 34 * k, { align: "left", weight: 700, maxWidth: mw });
            });
        });

        // the report travels back; the data does not
        const back = ease(progress(t, r + 0.4, r + 1.8));
        const report = progress(t, r + 0.1, r + 0.5) * (1 - progress(t, r + 1.7, r + 1.95));
        if (report > 0) {
            const a = { x: plotX + plot / 2, y: plotY - 84 * k };
            const b = { x: rcx, y: repoTop + 92 * k + badgeH / 2 };
            const p = quad(a, { x: (a.x + b.x) / 2, y: cy - 200 * k }, b, back);
            const s = lerp(1, 0.8, back);
            ctx.font = `600 ${18 * k}px ${FONT}`;
            const w = (ctx.measureText("Validation report").width + 64 * k) * s;
            const h = 48 * k * s;
            glow(ctx, p.x, p.y, w * 0.7, GREEN, 0.5 * report * out);
            layer(ctx, report * out, () => {
                shadow(ctx, k, true);
                ctx.fillStyle = "#fff";
                ctx.beginPath();
                ctx.roundRect(p.x - w / 2, p.y - h / 2, w, h, 8 * k);
                ctx.fill();
                shadow(ctx, k, false);
                tick(ctx, p.x - w / 2 + 24 * k * s, p.y, 11 * k * s);
                text(ctx, "Validation report", p.x + 14 * k * s, p.y, 18 * k * s, { color: "#000" });
            });
        }
    }
    //#endregion

    //#region the four principles, lit as the story covers them
    const tracker = progress(t, T.describe + 1, T.describe + 1.6) * out;
    if (tracker > 0) {
        const tileW = Math.min(196 * k, (W * 0.9 - 3 * 14 * k) / 4);
        const tileH = 50 * k;
        const y = safe.top + 32 * k;
        const all = progress(t, T.report + 3, T.report + 3.6);
        FAIR.forEach((p, i) => {
            const x = cx + (i - 1.5) * (tileW + 14 * k);
            const lit = easeOut(progress(t, p.at, p.at + 0.5));
            const flash = 1 - progress(t, p.at, p.at + 1.2);
            const pulse = all * (0.5 + 0.5 * Math.sin((t - T.report) * 3 - i * 0.6));
            glow(ctx, x - tileW / 2 + 26 * k, y, 70 * k, p.color, tracker * (lit * (flash > 0 && flash < 1 ? flash * 0.9 : 0) + pulse * 0.5));
            layer(ctx, tracker, () => {
                ctx.fillStyle = `rgba(255,255,255,${0.06 + lit * 0.06})`;
                ctx.strokeStyle = lit > 0 ? p.color : "rgba(255,255,255,0.15)";
                ctx.lineWidth = 1.5 * k;
                ctx.beginPath();
                ctx.roundRect(x - tileW / 2, y - tileH / 2, tileW, tileH, tileH / 2);
                ctx.fill();
                ctx.save();
                ctx.globalAlpha *= 0.25 + lit * 0.75;
                ctx.stroke();
                ctx.restore();
                ctx.fillStyle = lit > 0 ? p.color : "rgba(255,255,255,0.15)";
                ctx.save();
                ctx.globalAlpha *= 0.4 + lit * 0.6;
                ctx.beginPath();
                ctx.arc(x - tileW / 2 + 26 * k, y, 17 * k * (1 + 0.25 * Math.sin(Math.PI * progress(t, p.at, p.at + 0.5))), 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                text(ctx, p.letter, x - tileW / 2 + 26 * k, y + 1 * k, 19 * k, { weight: 800, color: lit > 0.5 ? NAVY : "#fff" });
                text(ctx, p.word, x - tileW / 2 + 52 * k, y, 18 * k, {
                    align: "left",
                    color: lit > 0 ? "#fff" : "rgba(255,255,255,0.45)",
                    maxWidth: tileW - 64 * k,
                });
            });
        });
    }
    //#endregion
};

const updateDom = (t: number) => {
    const next = sceneAt<Scene>(t, [
        ["intro", 0],
        ["papers", T.papers],
        ["describe", T.describe],
        ["find", T.find],
        ["pack", T.pack],
        ["validate", T.validate],
        ["report", T.report],
        ["outro", T.outro],
        ["credits", T.credits],
    ]);
    if (scene.value !== next) scene.value = next;
};

useCanvasTimeline(canvas, T.end, draw, { tick: updateDom, done: () => emit("done") });
</script>
