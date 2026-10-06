<template>
    <ShowcaseStage ref="stage" :scene="scene" :captions="captions" eyebrow="Part of Legal Research Software at BISS"
        title="Lawnotation" tagline="Annotate legal texts, together"
        outro="Open source and free to use, built at BISS for legal researchers and practitioners."
        url="lawnotation.org" :members="members" />
</template>
<script setup lang="ts">
import { computed, ref } from "vue";
import ShowcaseStage from "../shared/ShowcaseStage.vue";
import {
    ease,
    easeOut,
    FONT,
    Frame,
    lerp,
    MONO,
    progress,
    sceneAt,
    text,
    useCanvasTimeline,
    window01,
} from "../shared/anim";

defineProps<{ members: { photo?: string; title: string }[] }>();
const emit = defineEmits<{ done: [] }>();

/** Seconds into the animation at which each part starts. */
const T = { docs: 3.5, assign: 9, annotate: 15, agree: 23, publish: 29, outro: 34, end: 40 };

type Scene = "intro" | "docs" | "assign" | "annotate" | "agree" | "publish" | "outro";
const captions: Record<string, string> = {
    docs: "Upload legal documents: judgments, contracts, legislation. As PDF, HTML or plain text.",
    assign: "Assign them to a team of annotators, and let Lawnotation divide the work.",
    annotate: "Annotators label what matters in the text.",
    agree: "Compare their work: Lawnotation measures how well annotators agree.",
    publish: "Export the annotations as JSON, or publish them so others can discover and reuse them.",
};

const stage = ref<InstanceType<typeof ShowcaseStage>>();
const canvas = computed(() => stage.value?.canvas);
const scene = ref<Scene>("intro");

//#region Content

type Tag = "party" | "obligation" | "deadline" | "penalty";
const TAGS: Record<Tag, { label: string; color: string }> = {
    party: { label: "Party", color: "#6cb8ff" },
    obligation: { label: "Obligation", color: "#ffb347" },
    deadline: { label: "Deadline", color: "#5ee0a0" },
    penalty: { label: "Penalty", color: "#ff7eb6" },
};

/** An illustrative contract clause, split into the parts annotators label. */
const SEGMENTS: { text: string; tag: Tag | null }[] = [
    { text: "Article 4.", tag: null },
    { text: "The Seller", tag: "party" },
    { text: "shall deliver the goods", tag: "obligation" },
    { text: "to", tag: null },
    { text: "the Buyer", tag: "party" },
    { text: "no later than 1 March 2026.", tag: "deadline" },
    { text: "If the Seller fails to do so, it shall pay", tag: null },
    { text: "a penalty of €500 for each day of delay.", tag: "penalty" },
];
/** The second annotator misses one party and labels the penalty as an obligation. */
const SECOND: (Tag | null)[] = SEGMENTS.map((s, i) => (i === 4 ? null : i === 7 ? "obligation" : s.tag));
const disagree = (i: number) => SEGMENTS[i].tag !== SECOND[i];
const AGREEMENT = 0.84;

const DOC_TYPES = [
    { label: "PDF", color: "#ff6b6b" },
    { label: "HTML", color: "#ffb347" },
    { label: "TXT", color: "#9fb6ff" },
];
const DOCS = Array.from({ length: 9 }, (_, i) => ({ type: DOC_TYPES[i % 3], annotator: i % 3 }));
const ANNOTATORS = ["#6cb8ff", "#c38bff", "#5ee0a0"];

const JSON_LINES = [
    "{",
    '  "document": "contract-0142.pdf",',
    '  "label": "Deadline",',
    '  "text": "no later than 1 March 2026",',
    '  "start": 87, "end": 113,',
    '  "annotator": 1',
    "}",
];
const DATASETS = [
    "Tenancy judgments",
    "GDPR fines",
    "Employment contracts",
    "Asylum decisions",
    "Supply agreements",
    "Tax rulings",
];

//#endregion

//#region Drawing

const docCard = (ctx: CanvasRenderingContext2D, x: number, y: number, k: number, type: (typeof DOC_TYPES)[number], scale = 1) => {
    const w = 64 * k * scale;
    const h = 84 * k * scale;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y - h / 2, w, h, 5 * k * scale);
    ctx.fill();
    ctx.fillStyle = "#d1d5db";
    for (let i = 0; i < 5; i++) ctx.fillRect(x - w * 0.36, y - h * 0.22 + i * h * 0.12, w * (i === 4 ? 0.4 : 0.72), Math.max(1, h * 0.03));
    ctx.fillStyle = type.color;
    ctx.beginPath();
    ctx.roundRect(x - w * 0.4, y - h * 0.44, w * 0.56, h * 0.17, 3 * k * scale);
    ctx.fill();
    ctx.fillStyle = "#000";
    ctx.font = `700 ${11 * k * scale}px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(type.label, x - w * 0.12, y - h * 0.355);
};

const person = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "rgba(6,9,20,0.75)";
    ctx.beginPath();
    ctx.arc(x, y - r * 0.18, r * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.78, r * 0.62, r * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
};

/** A mouse pointer with its tip at (x, y). */
const drawPointer = (ctx: CanvasRenderingContext2D, x: number, y: number, s: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, s);
    ctx.lineTo(s * 0.27, s * 0.76);
    ctx.lineTo(s * 0.45, s * 1.12);
    ctx.lineTo(s * 0.6, s * 1.05);
    ctx.lineTo(s * 0.43, s * 0.7);
    ctx.lineTo(s * 0.72, s * 0.7);
    ctx.closePath();
    ctx.fillStyle = "#000";
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = s * 0.08;
    ctx.lineJoin = "round";
    ctx.shadowColor = "rgba(0,0,0,0.3)";
    ctx.shadowBlur = s * 0.3;
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.stroke();
    ctx.restore();
};

type Word = { text: string; x: number; y: number; w: number; seg: number; first: boolean };

/** Lays the clause out on a page of width `pw`, leaving room above each line for labels. */
const layoutClause = (ctx: CanvasRenderingContext2D, pw: number) => {
    const fs = pw / 21;
    const pad = fs * 1.4;
    const lineHeight = fs * 2.7;
    ctx.font = `500 ${fs}px Georgia, "Times New Roman", serif`;
    const space = ctx.measureText(" ").width;
    const words: Word[] = [];
    let x = pad;
    let y = pad + fs * 1.6;
    SEGMENTS.forEach((s, seg) => {
        s.text.split(" ").forEach((w, j) => {
            const width = ctx.measureText(w).width;
            if (x + width > pw - pad) {
                x = pad;
                y += lineHeight;
            }
            words.push({ text: w, x, y, w: width, seg, first: j === 0 });
            x += width + space;
        });
    });
    return { words, fs, height: y + fs * 1.5, space };
};

/**
 * Draws the clause on a white page centred at (cx, cy). `shown(seg, wordIndex)` gives how
 * far each word's highlight has appeared (0..1); `tags` says which label each part gets.
 */
const drawPage = (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    pw: number,
    k: number,
    alpha: number,
    tags: (Tag | null)[],
    shown: (seg: number, word: number) => number,
    mark: (seg: number) => number = () => 0,
    cursor = false
) => {
    if (alpha <= 0.003) return;
    const { words, fs, height, space } = layoutClause(ctx, pw);
    const x0 = cx - pw / 2;
    const y0 = cy - height / 2;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.roundRect(x0, y0, pw, height, 8 * k);
    ctx.fill();

    // highlights, joined across the gaps within a labelled part
    let pointer: { x: number; y: number } | null = null;
    const segWordIndex = new Map<number, number>();
    words.forEach((w) => {
        const tag = tags[w.seg];
        const j = segWordIndex.get(w.seg) ?? 0;
        segWordIndex.set(w.seg, j + 1);
        if (!tag) return;
        const f = shown(w.seg, j);
        if (f <= 0) return;
        // rects of neighbouring words meet exactly, so overlaps don't show as darker seams
        const i = words.indexOf(w);
        const prev = words[i - 1];
        const next = words[i + 1];
        const joinsPrev = prev && prev.seg === w.seg && prev.y === w.y;
        const joinsNext = next && next.seg === w.seg && next.y === w.y;
        const left = joinsPrev ? 0 : 3 * k;
        const width = w.w + left + (joinsNext ? space : 3 * k);
        ctx.save();
        ctx.globalAlpha *= f * 0.45;
        ctx.fillStyle = TAGS[tag].color;
        ctx.fillRect(x0 + w.x - left, y0 + w.y - fs * 0.62, width * easeOut(f), fs * 1.24);
        ctx.restore();
        // the annotator's pointer drags along the word being highlighted
        if (cursor && f < 1) pointer = { x: x0 + w.x - left + width * easeOut(f), y: y0 + w.y + fs * 0.45 };
    });

    ctx.fillStyle = "#111";
    ctx.font = `500 ${fs}px Georgia, "Times New Roman", serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    words.forEach((w) => ctx.fillText(w.text, x0 + w.x, y0 + w.y));

    // label chips above the first word of each labelled part
    words.forEach((w) => {
        const tag = tags[w.seg];
        if (!tag || !w.first) return;
        const f = shown(w.seg, 0);
        if (f <= 0) return;
        const label = TAGS[tag].label;
        ctx.font = `700 ${fs * 0.55}px ${FONT}`;
        const lw = ctx.measureText(label).width + fs * 0.6;
        const lh = fs * 0.85;
        const lx = x0 + w.x - 2 * k;
        const ly = y0 + w.y - fs * 0.7 - lh - 4 * k + (1 - easeOut(f)) * 6 * k;
        ctx.save();
        ctx.globalAlpha *= f;
        ctx.fillStyle = TAGS[tag].color;
        ctx.beginPath();
        ctx.roundRect(lx, ly, lw, lh, lh / 2);
        ctx.fill();
        ctx.fillStyle = "#000";
        ctx.textBaseline = "middle";
        ctx.fillText(label, lx + fs * 0.3, ly + lh / 2);
        ctx.restore();
    });

    // assigned inside the forEach above, which TypeScript's narrowing can't see
    const tip = pointer as { x: number; y: number } | null;
    if (tip) drawPointer(ctx, tip.x, tip.y, fs * 0.9);

    // disagreements get a pulsing outline
    words.forEach((w) => {
        const m = mark(w.seg);
        if (m <= 0) return;
        ctx.save();
        ctx.globalAlpha *= m;
        ctx.strokeStyle = "#ff4d4f";
        ctx.lineWidth = 2.5 * k;
        ctx.setLineDash([6 * k, 4 * k]);
        ctx.strokeRect(x0 + w.x - 4 * k, y0 + w.y - fs * 0.72, w.w + 8 * k, fs * 1.44);
        ctx.restore();
    });
    ctx.restore();
};

//#endregion

const draw = ({ ctx, t, W, k, safe }: Frame) => {
    const span = safe.bottom - safe.top;
    const cx = W / 2;
    const cy = safe.top + span * 0.52;

    //#region documents and annotators
    const groupAlpha = 1 - progress(t, T.annotate - 0.6, T.annotate);
    if (t >= T.docs && groupAlpha > 0) {
        const pile = (i: number) => ({
            x: W * 0.3 + ((i % 3) - 1) * 92 * k,
            y: cy + (Math.floor(i / 3) - 1) * 118 * k,
        });
        const annotator = (a: number) => ({ x: W * 0.68, y: cy + (a - 1) * span * 0.32 });
        const allocated = (i: number) => T.assign + 1.2 + i * 0.4;

        // annotators
        const people = progress(t, T.assign + 0.2, T.assign + 1) * groupAlpha;
        ANNOTATORS.forEach((color, a) => {
            const p = annotator(a);
            ctx.globalAlpha = people;
            person(ctx, p.x, p.y, 44 * k, color);
            text(ctx, `Annotator ${a + 1}`, p.x + 70 * k, p.y, 22 * k, { align: "left", alpha: people });
            const count = DOCS.filter((d, i) => d.annotator === a && t > allocated(i) + 0.8).length;
            if (count) text(ctx, `${count} document${count === 1 ? "" : "s"}`, p.x + 70 * k, p.y + 28 * k, 17 * k, { align: "left", color: "rgba(255,255,255,0.65)", weight: 500, alpha: people });
        });

        DOCS.forEach((d, i) => {
            const land = T.docs + 0.4 + i * 0.25;
            const f = easeOut(progress(t, land, land + 0.7));
            if (f <= 0) return;
            const home = pile(i);
            let p = { x: home.x, y: lerp(-100 * k, home.y, f) };
            const move = ease(progress(t, allocated(i), allocated(i) + 0.8));
            if (move > 0) {
                const a = annotator(d.annotator);
                const slot = DOCS.slice(0, i).filter((o) => o.annotator === d.annotator).length;
                const target = { x: a.x - 120 * k - slot * 16 * k, y: a.y + slot * 4 * k };
                p = { x: lerp(home.x, target.x, move), y: lerp(home.y, target.y, move) - Math.sin(move * Math.PI) * 60 * k };
                // the allocation, as a line from the pile
                ctx.globalAlpha = groupAlpha * 0.35 * (1 - progress(t, allocated(i) + 0.8, allocated(i) + 1.6));
                ctx.strokeStyle = ANNOTATORS[d.annotator];
                ctx.lineWidth = 2 * k;
                ctx.setLineDash([6 * k, 6 * k]);
                ctx.beginPath();
                ctx.moveTo(home.x, home.y);
                ctx.lineTo(p.x, p.y);
                ctx.stroke();
                ctx.setLineDash([]);
            }
            ctx.globalAlpha = groupAlpha * progress(t, land, land + 0.3);
            docCard(ctx, p.x, p.y, k, d.type, 1 - move * 0.35);
        });
    }
    //#endregion

    //#region annotating one clause, then comparing two annotators
    const pageIn = progress(t, T.annotate - 0.2, T.annotate + 0.6);
    const pageOut = progress(t, T.publish - 0.4, T.publish + 0.2);
    const split = ease(progress(t, T.agree, T.agree + 1.4));
    const start = (seg: number) => {
        const order = SEGMENTS.map((s, i) => (s.tag ? i : -1)).filter((i) => i >= 0);
        return T.annotate + 1.2 + order.indexOf(seg) * 1.1;
    };
    if (pageIn > 0 && pageOut < 1) {
        // the page's height grows with its width, so size it to fit the free band
        const ratio = layoutClause(ctx, 1000).height / 1000;
        const single = Math.min(W * 0.56, (span * 0.95) / ratio);
        const pair = Math.min(W * 0.33, (span * 0.82) / ratio);
        const pw = lerp(single, pair, split);
        const shownA = (seg: number, word: number) => progress(t, start(seg) + word * 0.09, start(seg) + word * 0.09 + 0.25);
        const marks = (seg: number) =>
            disagree(seg) ? progress(t, T.agree + 2.2, T.agree + 2.6) * (0.65 + 0.35 * Math.sin(t * 5)) : 0;
        drawPage(ctx, lerp(cx, cx - W * 0.22, split), cy, pw, k, pageIn * (1 - pageOut), SEGMENTS.map((s) => s.tag), shownA, marks, split < 0.05);

        if (split > 0) {
            const shownB = (seg: number, word: number) =>
                progress(t, T.agree + 0.8 + seg * 0.12 + word * 0.03, T.agree + 1.2 + seg * 0.12 + word * 0.03);
            // appears once the first page has made room, rather than sliding over it
            drawPage(ctx, lerp(cx + W * 0.3, cx + W * 0.22, split), cy, pw, k, progress(split, 0.45, 1) * (1 - pageOut), SECOND, shownB, marks);
            const titles = progress(t, T.agree + 0.8, T.agree + 1.4) * (1 - pageOut);
            const { height } = layoutClause(ctx, pw);
            text(ctx, "Annotator 1", cx - W * 0.22, cy - height / 2 - 30 * k, 22 * k, { alpha: titles });
            text(ctx, "Annotator 2", cx + W * 0.22, cy - height / 2 - 30 * k, 22 * k, { alpha: titles });

            // agreement meter between the pages
            const meter = progress(t, T.agree + 2.4, T.agree + 3) * (1 - pageOut);
            if (meter > 0) {
                const value = AGREEMENT * ease(progress(t, T.agree + 2.6, T.agree + 4.2));
                // as big as the gap between the pages allows
                const r = Math.min(74 * k, (W * 0.44 - pw) * 0.36);
                const my = cy + 10 * k;
                ctx.globalAlpha = meter;
                ctx.lineCap = "round";
                ctx.lineWidth = 12 * k;
                ctx.strokeStyle = "rgba(255,255,255,0.15)";
                ctx.beginPath();
                ctx.arc(cx, my, r, Math.PI, 0);
                ctx.stroke();
                ctx.strokeStyle = "#5ee0a0";
                ctx.beginPath();
                ctx.arc(cx, my, r, Math.PI, Math.PI + Math.PI * value);
                ctx.stroke();
                ctx.lineCap = "butt";
                text(ctx, value.toFixed(2), cx, my - r * 0.3, r * 0.5, { weight: 700, alpha: meter });
                text(ctx, "agreement", cx, my + r * 0.3, Math.min(18 * k, r * 0.24), { weight: 500, color: "rgba(255,255,255,0.7)", alpha: meter });
            }
        }
    }
    //#endregion

    //#region export and publish
    const pub = progress(t, T.publish, T.publish + 0.6) * (1 - progress(t, T.outro, T.outro + 0.8) * 0.85);
    if (pub > 0) {
        const cardW = Math.min(W * 0.42, 720 * k);
        const lineH = 34 * k;
        const cardH = JSON_LINES.length * lineH + 40 * k;
        const shrink = ease(progress(t, T.publish + 3.2, T.publish + 4));
        const cardX = lerp(cx - cardW / 2, cx - cardW * 0.22, shrink);
        const cardY = lerp(cy - cardH / 2, safe.top, shrink);
        const scale = 1 - shrink * 0.55;

        ctx.save();
        ctx.globalAlpha = pub;
        ctx.translate(cardX, cardY);
        ctx.scale(scale, scale);
        ctx.fillStyle = "#0f1530";
        ctx.strokeStyle = "rgba(255,255,255,0.18)";
        ctx.lineWidth = 1.5 * k;
        ctx.beginPath();
        ctx.roundRect(0, 0, cardW, cardH, 10 * k);
        ctx.fill();
        ctx.stroke();
        const typed = progress(t, T.publish + 0.4, T.publish + 2.6) * JSON_LINES.join("").length;
        let used = 0;
        ctx.font = `500 ${22 * k}px ${MONO}`;
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        JSON_LINES.forEach((line, i) => {
            const visible = line.slice(0, Math.max(0, Math.floor(typed - used)));
            used += line.length;
            // keys in blue, everything after the first colon in green
            const colon = line.indexOf(":");
            const key = colon < 0 ? visible : visible.slice(0, colon + 1);
            const value = colon < 0 ? "" : visible.slice(colon + 1);
            ctx.fillStyle = colon < 0 ? "#e6e9f5" : "#9fb6ff";
            ctx.fillText(key, 24 * k, 20 * k + i * lineH);
            ctx.fillStyle = "#5ee0a0";
            ctx.fillText(value, 24 * k + ctx.measureText(line.slice(0, colon + 1)).width, 20 * k + i * lineH);
        });
        ctx.restore();

        // the publish button, pressed
        const button = progress(t, T.publish + 2.4, T.publish + 2.8) * (1 - progress(t, T.publish + 3.4, T.publish + 3.8));
        if (button > 0) {
            const press = 1 - 0.08 * Math.sin(progress(t, T.publish + 2.9, T.publish + 3.2) * Math.PI);
            const bw = 190 * k * press;
            const bh = 56 * k * press;
            const by = cy + cardH / 2 + 48 * k;
            ctx.globalAlpha = button * pub;
            ctx.fillStyle = "#fff";
            ctx.beginPath();
            ctx.roundRect(cx - bw / 2, by - bh / 2, bw, bh, bh / 2);
            ctx.fill();
            text(ctx, "Publish", cx, by, 22 * k * press, { color: "#000", alpha: button * pub });
        }

        // published tasks others can discover
        DATASETS.forEach((name, i) => {
            const f = easeOut(progress(t, T.publish + 3.6 + i * 0.15, T.publish + 4.2 + i * 0.15));
            if (f <= 0) return;
            const col = i % 3;
            const row = Math.floor(i / 3);
            const w = Math.min((W * 0.86 - 48 * k) / 3, 340 * k);
            const h = 92 * k;
            const x = cx + (col - 1) * (w + 24 * k) - w / 2;
            const y = cy - span * 0.02 + row * (h + 24 * k) + (1 - f) * 30 * k;
            ctx.globalAlpha = pub * f;
            ctx.fillStyle = i === 0 ? "#fff" : "rgba(255,255,255,0.1)";
            ctx.beginPath();
            ctx.roundRect(x, y, w, h, 8 * k);
            ctx.fill();
            text(ctx, name, x + 22 * k, y + 34 * k, 21 * k, {
                align: "left",
                color: i === 0 ? "#000" : "#fff",
                alpha: pub * f,
                maxWidth: w - 44 * k,
            });
            text(ctx, i === 0 ? "Published just now" : `${120 + i * 37} annotations`, x + 22 * k, y + 62 * k, 16 * k, {
                align: "left",
                weight: 500,
                color: i === 0 ? "#4b4b4b" : "rgba(255,255,255,0.6)",
                alpha: pub * f,
            });
        });
        text(ctx, "Published annotation tasks, open for anyone to discover", cx, cy - span * 0.02 - 34 * k, 22 * k, {
            maxWidth: W * 0.8,
            color: "rgba(255,255,255,0.8)",
            weight: 500,
            alpha: window01(t, T.publish + 4.2, T.outro + 1, 0.4) * pub,
        });
    }
    //#endregion
};

const updateDom = (t: number) => {
    const next = sceneAt<Scene>(t, [
        ["intro", 0],
        ["docs", T.docs],
        ["assign", T.assign],
        ["annotate", T.annotate],
        ["agree", T.agree],
        ["publish", T.publish],
        ["outro", T.outro],
    ]);
    if (scene.value !== next) scene.value = next;
};

useCanvasTimeline(canvas, T.end, draw, { tick: updateDom, done: () => emit("done") });
</script>
