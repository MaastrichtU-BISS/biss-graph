<template>
    <div class="about">
        <ShowcaseStage ref="stage" theme="light" :scene="scene" :captions="captions"
            eyebrow="Brightlands Institute for Smart Society at Maastricht University" title="What is BISS?"
            tagline="Human-centred AI and data science for a smart, inclusive society"
            outro="Where science meets responsible innovation. Ten years and counting." url="biss-institute.com"
            :members="members" />
    </div>
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
    mulberry32,
    progress,
    sceneAt,
    text,
    useCanvasTimeline,
} from "../shared/anim";

defineProps<{ members: { photo?: string; title: string }[] }>();
const emit = defineEmits<{ done: [] }>();

/** Seconds into the animation at which each part starts. */
const T = { who: 3.5, disciplines: 10, themes: 16.5, how: 23.5, decade: 30.5, partners: 37.5, outro: 44, end: 50 };

type Scene = "intro" | "who" | "disciplines" | "themes" | "how" | "decade" | "partners" | "outro";
const captions: Record<string, string> = {
    who: "BISS is a research institute of Maastricht University, at the Brightlands Smart Services Campus in Heerlen.",
    disciplines: "Ethics, law, privacy, consumer behaviour, neuroscience and data science work side by side.",
    themes: "Together they apply AI and data science to health, finance, law, public services, mobility and industry.",
    how: "Every project follows the data science lifecycle, with ethical, legal and societal aspects checked at each step.",
    decade: "Founded in 2016, BISS celebrates ten years of responsible innovation in 2026.",
    partners: "Always with academic, public and private partners, and funders such as NWO and the European Union.",
};

const stage = ref<InstanceType<typeof ShowcaseStage>>();
const canvas = computed(() => stage.value?.canvas);
const scene = ref<Scene>("intro");

//#region Palette: Brightlands-like accents on white

const INK = "#0b1020";
const GREY = "#5b6170";
const HAIR = "#e1e4ea";
const MAGENTA = "#9b00a5";
const PINK = "#e6003c";
const ORANGE = "#ff7d00";
const YELLOW = "#ffc000";
const GREEN = "#02a528";
const CYAN = "#00bee6";
const ACCENTS = [MAGENTA, PINK, ORANGE, YELLOW, GREEN, CYAN];

//#endregion

//#region Content (from biss-institute.com: home, about, contact, 10 years and the project pages)

const DISCIPLINES = [
    { label: "Data science & AI", color: MAGENTA },
    { label: "Ethics", color: PINK },
    { label: "Law", color: ORANGE },
    { label: "Privacy", color: GREEN },
    { label: "Consumer behaviour", color: CYAN },
    { label: "Neuroscience", color: YELLOW },
];

const THEMES = [
    { label: "Health", examples: "BETTER and FAIR4AI", color: PINK },
    { label: "Finance", examples: "Automated financial advice and a VR experience", color: ORANGE },
    { label: "Law", examples: "Lawnotation and Case Law Explorer", color: MAGENTA },
    { label: "Public services", examples: "A clear welfare application", color: GREEN },
    { label: "Mobility", examples: "BeNeDrone and Flying Forward", color: CYAN },
    { label: "Industry", examples: "DigiMach and preventing factory shutdowns", color: YELLOW },
];

const STEPS = [
    { title: "Understand the problem", sub: "Listen to partners" },
    { title: "Collect data", sub: "Lawful and private" },
    { title: "Clean & analyse", sub: "Transparent and fair" },
    { title: "Build a model", sub: "Tested and responsible" },
    { title: "Share outcomes", sub: "Clear for everyone" },
];

const MILESTONES = [
    { year: 2016, title: "BISS is founded", sub: "Early support: KennisAs grant, Province of Limburg", up: true, color: MAGENTA },
    { year: 2017, title: "Rudolf Müller", sub: "Scientific Director 2016–2018", up: false, color: ORANGE },
    { year: 2020, title: "Lisa Brüggen", sub: "Scientific Lead 2019–2021", up: true, color: GREEN },
    { year: 2026, title: "10 years of BISS", sub: "An independent institute for AI and data science", up: false, color: PINK },
];

const STATS = [
    { value: 24, label: "Projects" },
    { value: 35, label: "Partners" },
    { value: 17, label: "Presentations" },
    { value: -1, label: "Vlaaien" },
];

/** Logos from biss-institute.com (homepage "Current partners" and the project pages). */
const LOGO_URLS = import.meta.glob<string>("../../assets/images/partners/*.webp", { eager: true, import: "default" });
const LOGOS: Record<string, HTMLImageElement> = {};
for (const [path, url] of Object.entries(LOGO_URLS)) {
    const img = new Image();
    img.src = url;
    LOGOS[path.split("/").pop()!.replace(".webp", "")] = img;
}
type Org = { name: string; logo?: string };
const PARTNERS: Org[] = [
    { name: "Maastricht University", logo: "maastricht-university" },
    { name: "TNO", logo: "tno" },
    { name: "Brightlands Smart Services Campus", logo: "bssc" },
    { name: "Gemeente Sittard-Geleen", logo: "gemeente-sittard-geleen" },
    { name: "Open Universiteit", logo: "open-universiteit" },
    { name: "APG", logo: "apg" },
    { name: "Zuyd", logo: "zuyd" },
    { name: "a.s.r.", logo: "asr" },
    { name: "Netherlands eScience Center", logo: "escience-center" },
    { name: "AFM", logo: "afm" },
    { name: "Universiteit van Amsterdam", logo: "universiteit-van-amsterdam" },
    { name: "Ortec", logo: "ortec" },
    { name: "Avans Hogeschool", logo: "avans-hogeschool" },
    { name: "Nibud" },
    { name: "Politecnico di Milano", logo: "politecnico-di-milano" },
    { name: "TecAlliance", logo: "tecalliance" },
    { name: "University of Valencia", logo: "university-of-valencia" },
    { name: "Datrix", logo: "datrix" },
    { name: "Maastro", logo: "maastro-clinic" },
    { name: "The Barn", logo: "the-barn" },
    { name: "Uniklinik Köln", logo: "uniklinik-koln" },
    { name: "CBS", logo: "cbs" },
    { name: "FIOD", logo: "fiod" },
    { name: "Cubiss", logo: "cubiss" },
];
const FUNDERS: Org[] = [
    { name: "NWO", logo: "nwo" },
    { name: "European Union", logo: "european-union" },
    { name: "Province of Limburg", logo: "provincie-limburg" },
    { name: "Netspar", logo: "netspar" },
    { name: "Ministry of BZK", logo: "bzk" },
    { name: "CLICKNL", logo: "clicknl" },
];

//#endregion

//#region Helpers

/** Fades in over [a, a+fadeIn] (eased) and out over [b-0.45, b]: scenes never blend. */
const life = (t: number, a: number, b: number, fadeIn = 0.6) =>
    easeOut(progress(t, a, a + fadeIn)) * (1 - ease(progress(t, b - 0.45, b)));

const hexA = (hex: string, a: number) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
};

const dot = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
    ctx.fill();
};

/** A pill with a coloured dot, like the tags on brightlands.com. Returns its width. */
function chip(
    ctx: CanvasRenderingContext2D,
    label: string,
    x: number,
    y: number,
    size: number,
    color: string,
    alpha: number,
    { dark = false, measureOnly = false } = {}
) {
    ctx.font = `600 ${size}px ${FONT}`;
    const tw = ctx.measureText(label).width;
    const h = size * 2.1;
    const pad = size * 0.85;
    const r = size * 0.3;
    const w = pad + r * 2 + size * 0.55 + tw + pad;
    if (measureOnly || alpha <= 0.003) return w;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = dark ? INK : "#fff";
    ctx.beginPath();
    ctx.roundRect(x, y - h / 2, w, h, h / 2);
    ctx.fill();
    if (!dark) {
        ctx.strokeStyle = HAIR;
        ctx.lineWidth = Math.max(1, size * 0.06);
        ctx.stroke();
    }
    dot(ctx, x + pad + r, y, r, color);
    text(ctx, label, x + pad + r * 2 + size * 0.55, y + size * 0.03, size, {
        color: dark ? "#fff" : INK,
        align: "left",
        weight: 600,
    });
    ctx.restore();
    return w;
}

/** A white card with an organisation's logo, or its name when there is no logo. */
function logoCard(
    ctx: CanvasRenderingContext2D,
    name: string,
    logo: string | undefined,
    x: number,
    y: number,
    w: number,
    h: number,
    k: number,
    alpha: number,
    accent?: string
) {
    if (alpha <= 0.003) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = "rgba(11,16,32,0.10)";
    ctx.shadowBlur = 20 * k;
    ctx.shadowOffsetY = 6 * k;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y - h / 2, w, h, 12 * k);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = HAIR;
    ctx.lineWidth = 1;
    ctx.stroke();
    if (accent) {
        ctx.fillStyle = accent;
        ctx.fillRect(x - w / 2 + 14 * k, y + h / 2 - 3 * k, w - 28 * k, 3 * k);
    }
    const img = logo ? LOGOS[logo] : undefined;
    if (img && img.complete && img.naturalWidth > 0) {
        const bw = w - h * 0.36;
        const bh = h * 0.68;
        const s = Math.min(bw / img.naturalWidth, bh / img.naturalHeight);
        const iw = img.naturalWidth * s;
        const ih = img.naturalHeight * s;
        ctx.drawImage(img, x - iw / 2, y - ih / 2, iw, ih);
    } else {
        text(ctx, name, x, y, 22 * k, { color: INK, weight: 800, maxWidth: w - 28 * k });
    }
    ctx.restore();
}

/** The word "BISS" as a dot matrix, like the dotted Brightlands wordmark. */
type MatrixDot = { x: number; y: number; color: string; delay: number; fromX: number; fromY: number };
let matrix: { size: number; dots: MatrixDot[]; w: number; h: number; step: number } | null = null;
function bissDots(size: number) {
    if (matrix && matrix.size === size) return matrix;
    const off = document.createElement("canvas");
    const c = off.getContext("2d")!;
    const font = `900 ${size}px ${FONT}`;
    c.font = font;
    const m = c.measureText("BISS");
    const w = Math.ceil(m.width);
    const h = Math.ceil(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent);
    off.width = w + 4;
    off.height = h + 4;
    c.font = font;
    c.fillStyle = "#000";
    c.textBaseline = "alphabetic";
    c.fillText("BISS", 2, 2 + m.actualBoundingBoxAscent);
    const data = c.getImageData(0, 0, off.width, off.height).data;
    const step = size / 16;
    const random = mulberry32(7);
    const dots: MatrixDot[] = [];
    for (let y = step / 2; y < off.height; y += step) {
        for (let x = step / 2; x < off.width; x += step) {
            if (data[(Math.floor(y) * off.width + Math.floor(x)) * 4 + 3] < 140) continue;
            const angle = random() * Math.PI * 2;
            const far = 0.6 + random() * 0.8;
            dots.push({
                x: x - off.width / 2,
                y: y - off.height / 2,
                color: random() < 0.12 ? ACCENTS[Math.floor(random() * ACCENTS.length)] : INK,
                delay: (x / off.width) * 0.7 + random() * 0.3,
                fromX: Math.cos(angle) * far,
                fromY: Math.sin(angle) * far,
            });
        }
    }
    matrix = { size, dots, w: off.width, h: off.height, step };
    return matrix;
}

//#endregion

const draw = ({ ctx, t, W, H, k, safe }: Frame) => {
    const span = safe.bottom - safe.top;
    const cy = safe.top + span / 2;
    const centreR = Math.min(span * 0.13, W * 0.075);
    const netAlpha = 1 - ease(progress(t, T.themes - 0.45, T.themes));

    //#region backdrop: a faint dot grid, drifting with a slow wave
    {
        const step = 30 * k;
        ctx.save();
        ctx.fillStyle = INK;
        const s = 1.8 * k;
        for (let y = step / 2; y < H; y += step) {
            for (let x = step / 2; x < W; x += step) {
                ctx.globalAlpha = 0.035 + 0.035 * Math.sin(x / (W * 0.18) + y / (H * 0.4) - t * 0.6);
                ctx.fillRect(x - s / 2, y - s / 2, s, s);
            }
        }
        ctx.restore();
    }
    //#endregion

    //#region disciplines: a growing network around BISS (lines under the BISS disc, nodes on top)
    const network = () => {
        // the ring is pulled in, or the labels shrink, so every label stays on screen
        let labelSize = 30 * k;
        ctx.font = `700 ${labelSize}px ${FONT}`;
        const widest = Math.max(...DISCIPLINES.map((d) => ctx.measureText(d.label).width));
        const room = (rx: number) => W / 2 - rx - 44 * k - W * 0.03;
        let rx = Math.min(W * 0.27, span * 0.78, W / 2 - 44 * k - W * 0.03 - widest);
        if (rx < W * 0.17) {
            rx = W * 0.17;
            labelSize *= Math.max(0.55, room(rx) / widest);
        }
        const ry = span * 0.38;
        const nodes = DISCIPLINES.map((d, i) => {
            const angle = ((-60 + i * 60) * Math.PI) / 180;
            return { ...d, x: W / 2 + Math.cos(angle) * rx, y: cy + Math.sin(angle) * ry, cos: Math.cos(angle) };
        });
        return { nodes, rx, labelSize };
    };
    const appear = (i: number) => T.disciplines + 1.1 + i * 0.35;
    const inNetwork = t >= T.disciplines && t < T.themes;
    const net = network();
    const nodes = net.nodes;
    if (inNetwork) {
        ctx.save();
        // every discipline linked to every other: the interdisciplinary mesh
        const mesh = progress(t, T.disciplines + 3.3, T.disciplines + 4.6);
        if (mesh > 0) {
            ctx.lineWidth = 1.3 * k;
            nodes.forEach((a, i) =>
                nodes.slice(i + 1).forEach((b, j) => {
                    const f = ease(progress(mesh, (i + j) * 0.06, (i + j) * 0.06 + 0.5));
                    if (f <= 0) return;
                    ctx.globalAlpha = 0.28 * f * netAlpha;
                    ctx.strokeStyle = INK;
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(lerp(a.x, b.x, f), lerp(a.y, b.y, f));
                    ctx.stroke();
                })
            );
            // ideas travelling between disciplines
            nodes.forEach((a, i) => {
                const b = nodes[(i + 2) % nodes.length];
                const q = (t * 0.35 + i * 0.29) % 1;
                ctx.globalAlpha = netAlpha * mesh * Math.sin(q * Math.PI);
                dot(ctx, lerp(a.x, b.x, q), lerp(a.y, b.y, q), 4 * k, a.color);
            });
        }
        // spokes from BISS
        nodes.forEach((n, i) => {
            const f = ease(progress(t, appear(i) - 0.3, appear(i) + 0.3));
            if (f <= 0) return;
            ctx.globalAlpha = netAlpha;
            ctx.strokeStyle = hexA(n.color, 0.7);
            ctx.lineWidth = 2.5 * k;
            ctx.beginPath();
            ctx.moveTo(W / 2, cy);
            ctx.lineTo(lerp(W / 2, n.x, f), lerp(cy, n.y, f));
            ctx.stroke();
        });
        ctx.restore();

    }
    //#endregion

    //#region who: BISS as a dot matrix, then the name and where it sits
    const whoAlpha = life(t, T.who, T.disciplines, 0.01);
    // the dots live on into the disciplines scene, as the network's centre
    if (t >= T.who && t < T.themes) {
        ctx.font = `900 100px ${FONT}`;
        const ratio = ctx.measureText("BISS").width / 100;
        const size = Math.round(Math.min((W * 0.52) / ratio, (span * 0.42) / 0.74));
        const M = bissDots(size);
        const home = { x: W / 2, y: safe.top + span * 0.31 };
        const morph = ease(progress(t, T.disciplines, T.disciplines + 1.3));
        const s = lerp(1, (centreR * 1.6) / M.w, morph);
        const ox = lerp(home.x, W / 2, morph);
        const oy = lerp(home.y, cy, morph);
        const r = Math.max(0.8, M.step * s * lerp(0.33, 0.47, morph));

        // the centre disc of the network, behind the dots
        const disc = easeOut(progress(t, T.disciplines + 0.5, T.disciplines + 1.3)) * netAlpha;
        if (t >= T.disciplines + 0.5 && netAlpha > 0.003) {
            ctx.save();
            // an opaque white disc, so the network's lines pass underneath BISS
            ctx.globalAlpha = netAlpha;
            ctx.shadowColor = `rgba(11,16,32,${0.12 * disc})`;
            ctx.shadowBlur = 30 * k;
            ctx.shadowOffsetY = 8 * k;
            dot(ctx, W / 2, cy, centreR * (0.85 + 0.15 * disc), "#fff");
            ctx.shadowColor = "transparent";
            ctx.globalAlpha = disc;
            const g = ctx.createLinearGradient(W / 2 - centreR, cy - centreR, W / 2 + centreR, cy + centreR);
            g.addColorStop(0, MAGENTA);
            g.addColorStop(1, PINK);
            ctx.strokeStyle = g;
            ctx.lineWidth = 4 * k;
            ctx.beginPath();
            ctx.arc(W / 2, cy, centreR * (0.85 + 0.15 * disc), 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        ctx.save();
        for (const d of M.dots) {
            const p = easeOut(progress(t, T.who + 0.45 + d.delay * 1.1, T.who + 1.35 + d.delay * 1.1));
            if (p <= 0) continue;
            const x = ox + d.x * s + (1 - p) * d.fromX * W * 0.5;
            const y = oy + d.y * s + (1 - p) * d.fromY * span * 0.6;
            ctx.globalAlpha = p * netAlpha;
            dot(ctx, x, y, r * (0.6 + 0.4 * p), d.color);
        }
        ctx.restore();

        // the full name, word by word
        if (whoAlpha > 0.003) {
            const name = "Brightlands Institute for Smart Society";
            ctx.font = `700 ${52 * k}px ${FONT}`;
            const size = Math.min(52 * k, (W * 0.9 * 52 * k) / (ctx.measureText(name).width || 1));
            ctx.font = `700 ${size}px ${FONT}`;
            const words = name.split(" ");
            const full = ctx.measureText(name).width;
            const space = ctx.measureText(" ").width;
            let x = W / 2 - full / 2;
            const y = safe.top + span * 0.67;
            words.forEach((word, i) => {
                const a = easeOut(progress(t, T.who + 1.6 + i * 0.16, T.who + 2.2 + i * 0.16));
                text(ctx, word, x, y + (1 - a) * 18 * k, size, {
                    color: word === "Smart" || word === "Society" ? MAGENTA : INK,
                    weight: 700,
                    align: "left",
                    alpha: a * whoAlpha,
                });
                ctx.font = `700 ${size}px ${FONT}`;
                x += ctx.measureText(word).width + space;
            });
            // a gradient hairline under the name
            const line = ease(progress(t, T.who + 2.4, T.who + 3.4));
            if (line > 0) {
                ctx.save();
                ctx.globalAlpha = whoAlpha;
                const g = ctx.createLinearGradient(W / 2 - full / 2, 0, W / 2 + full / 2, 0);
                g.addColorStop(0, MAGENTA);
                g.addColorStop(1, PINK);
                ctx.fillStyle = g;
                ctx.fillRect(W / 2 - (full / 2) * line, y + size * 0.72, full * line, 3 * k);
                ctx.restore();
            }

            // where BISS sits
            const chips = [
                { label: "Research institute of Maastricht University", color: CYAN },
                { label: "Brightlands Smart Services Campus, Heerlen", color: MAGENTA },
            ];
            const cs = Math.min(21 * k, W * 0.012);
            const gap = 16 * k;
            const widths = chips.map((c) => chip(ctx, c.label, 0, 0, cs, c.color, 0, { measureOnly: true }));
            let cx = W / 2 - (widths[0] + widths[1] + gap) / 2;
            const chipY = safe.top + span * 0.87;
            chips.forEach((c, i) => {
                const a = easeOut(progress(t, T.who + 3.0 + i * 0.35, T.who + 3.7 + i * 0.35));
                chip(ctx, c.label, cx, chipY + (1 - a) * 14 * k, cs, c.color, a * whoAlpha);
                cx += widths[i] + gap;
            });
        }
    }
    //#endregion

    //#region disciplines: the nodes and their labels, above the lines
    if (inNetwork) {
        nodes.forEach((n, i) => {
            const a = easeOut(progress(t, appear(i) + 0.2, appear(i) + 0.8));
            if (a <= 0) return;
            const pulse = 1 + 0.08 * Math.sin(t * 2.4 + i);
            ctx.save();
            ctx.globalAlpha = netAlpha * a * 0.18;
            dot(ctx, n.x, n.y, 30 * k * a * pulse, n.color);
            ctx.globalAlpha = netAlpha * a;
            dot(ctx, n.x, n.y, 15 * k * a, n.color);
            dot(ctx, n.x, n.y, 6 * k * a, "#fff");
            ctx.restore();
            const side = n.cos > 0.1 ? 1 : n.cos < -0.1 ? -1 : 0;
            text(ctx, n.label, n.x + side * 44 * k, n.y, net.labelSize, {
                color: INK,
                weight: 700,
                align: side > 0 ? "left" : side < 0 ? "right" : "center",
                alpha: netAlpha * a,
                maxWidth: W / 2 - net.rx - 44 * k - W * 0.02,
            });
        });
    }
    //#endregion

    //#region themes: orbiting clusters of real projects
    if (t >= T.themes && t < T.how) {
        const out = 1 - ease(progress(t, T.how - 0.45, T.how));
        const r = Math.min(span * 0.105, W * 0.056);
        THEMES.forEach((th, i) => {
            const col = i % 3;
            const row = Math.floor(i / 3);
            const x = W * (0.2 + 0.3 * col);
            const y = safe.top + span * (row ? 0.71 : 0.24);
            const pop = easeOut(progress(t, T.themes + 0.2 + i * 0.22, T.themes + 0.9 + i * 0.22));
            if (pop <= 0) return;
            const a = pop * out;
            const R = r * (0.7 + 0.3 * pop);
            ctx.save();
            // orbit ring and satellites (one per project or publication, illustrative)
            ctx.globalAlpha = a * 0.5;
            ctx.strokeStyle = hexA(th.color, 0.6);
            ctx.lineWidth = 1.2 * k;
            ctx.setLineDash([3 * k, 6 * k]);
            ctx.beginPath();
            ctx.arc(x, y, R * 1.4, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.globalAlpha = a * 0.13;
            dot(ctx, x, y, R, th.color);
            ctx.globalAlpha = a;
            ctx.strokeStyle = th.color;
            ctx.lineWidth = 3 * k;
            ctx.beginPath();
            ctx.arc(x, y, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ease(progress(t, T.themes + 0.4 + i * 0.22, T.themes + 1.4 + i * 0.22)));
            ctx.stroke();
            for (let j = 0; j < 4; j++) {
                const angle = t * (0.5 + j * 0.17) * (j % 2 ? -1 : 1) + j * 1.7 + i;
                ctx.globalAlpha = a;
                dot(ctx, x + Math.cos(angle) * R * 1.4, y + Math.sin(angle) * R * 1.4, (4 + (j % 3) * 1.6) * k, j === 0 ? INK : th.color);
            }
            ctx.restore();
            text(ctx, th.label, x, y, 27 * k, { color: INK, weight: 800, alpha: a, maxWidth: R * 1.75 });
            text(ctx, th.examples, x, y + R * 1.4 + 32 * k, 21 * k, {
                color: GREY,
                weight: 500,
                alpha: a * progress(t, T.themes + 1.2 + i * 0.22, T.themes + 1.8 + i * 0.22),
                maxWidth: W * 0.27,
            });
        });
    }
    //#endregion

    //#region how: the data science lifecycle, with ELS aspects at every step
    if (t >= T.how && t < T.decade) {
        const out = 1 - ease(progress(t, T.decade - 0.45, T.decade));
        const left = W * 0.1;
        const stepW = (W * 0.8) / STEPS.length;
        const xs = STEPS.map((_, i) => left + (i + 0.5) * stepW);
        const y = safe.top + span * 0.3;
        const R = Math.min(38 * k, stepW * 0.2);
        const at = (i: number) => T.how + 0.4 + i * 0.7;

        // the rail, drawn as the steps appear
        const rail = ease(progress(t, at(0), at(STEPS.length - 1) + 0.3));
        ctx.save();
        ctx.globalAlpha = out;
        const g = ctx.createLinearGradient(xs[0], 0, xs[xs.length - 1], 0);
        g.addColorStop(0, MAGENTA);
        g.addColorStop(1, PINK);
        ctx.strokeStyle = g;
        ctx.lineWidth = 4 * k;
        ctx.beginPath();
        ctx.moveTo(xs[0], y);
        ctx.lineTo(lerp(xs[0], xs[xs.length - 1], rail), y);
        ctx.stroke();

        // the loop back: a lifecycle, not a line
        const loop = ease(progress(t, at(STEPS.length - 1) + 0.4, at(STEPS.length - 1) + 1.4));
        if (loop > 0) {
            const top = y - R - 10 * k;
            const ctrlY = y - R - span * 0.26;
            const x0 = xs[xs.length - 1];
            const x1 = xs[0];
            ctx.strokeStyle = hexA(INK, 0.35);
            ctx.lineWidth = 2 * k;
            ctx.setLineDash([6 * k, 7 * k]);
            ctx.beginPath();
            const N = 40;
            let px = x0;
            let py = top;
            for (let n = 0; n <= N * loop; n++) {
                const u = n / N;
                px = (1 - u) * (1 - u) * x0 + 2 * (1 - u) * u * (W / 2) + u * u * x1;
                py = (1 - u) * (1 - u) * top + 2 * (1 - u) * u * ctrlY + u * u * top;
                if (n === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.stroke();
            ctx.setLineDash([]);
            if (loop >= 1) {
                // arrowhead pointing down onto step one
                ctx.fillStyle = hexA(INK, 0.5);
                ctx.beginPath();
                ctx.moveTo(x1, top + 4 * k);
                ctx.lineTo(x1 - 8 * k, top - 10 * k);
                ctx.lineTo(x1 + 8 * k, top - 10 * k);
                ctx.fill();
            }
            text(ctx, "The data science lifecycle", W / 2, y - R - span * 0.13 - 24 * k, 20 * k, {
                color: GREY,
                weight: 500,
                alpha: out * loop,
            });
        }

        // a pulse running along the rail once it is built
        if (rail >= 1) {
            const q = ((t - at(STEPS.length - 1) - 0.3) * 0.45) % 1;
            ctx.globalAlpha = out * Math.sin(q * Math.PI);
            dot(ctx, lerp(xs[0], xs[xs.length - 1], q), y, 7 * k, PINK);
        }
        ctx.restore();

        const bandY = safe.top + span * 0.84;
        const bandH = Math.min(64 * k, span * 0.11);
        STEPS.forEach((s, i) => {
            const a = easeOut(progress(t, at(i), at(i) + 0.6)) * out;
            if (a <= 0.003) return;
            const x = xs[i];
            ctx.save();
            ctx.globalAlpha = a;
            ctx.shadowColor = "rgba(11,16,32,0.12)";
            ctx.shadowBlur = 18 * k;
            ctx.shadowOffsetY = 5 * k;
            dot(ctx, x, y, R * (0.8 + 0.2 * a), "#fff");
            ctx.shadowColor = "transparent";
            ctx.strokeStyle = ACCENTS[i];
            ctx.lineWidth = 3 * k;
            ctx.beginPath();
            ctx.arc(x, y, R * (0.8 + 0.2 * a), 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
            text(ctx, `0${i + 1}`, x, y + 1 * k, 24 * k, { color: INK, weight: 800, alpha: a });
            const ty = y + R + 38 * k;
            text(ctx, s.title, x, ty + (1 - a) * 12 * k, 25 * k, { color: INK, weight: 700, alpha: a, maxWidth: stepW * 0.92 });
            text(ctx, s.sub, x, ty + 34 * k, 19 * k, { color: GREY, weight: 500, alpha: a, maxWidth: stepW * 0.9 });

            // each step is tied to the ELS band
            const tie = ease(progress(t, T.how + 4.4 + i * 0.12, T.how + 5.0 + i * 0.12));
            if (tie > 0) {
                const y0 = ty + 62 * k;
                const y1 = bandY - bandH / 2;
                ctx.save();
                ctx.globalAlpha = out;
                ctx.strokeStyle = hexA(PINK, 0.55);
                ctx.lineWidth = 2 * k;
                ctx.setLineDash([4 * k, 5 * k]);
                ctx.beginPath();
                ctx.moveTo(x, y0);
                ctx.lineTo(x, lerp(y0, y1, tie));
                ctx.stroke();
                ctx.restore();
            }
        });

        const band = easeOut(progress(t, T.how + 4.0, T.how + 4.7)) * out;
        if (band > 0.003) {
            const w = W * 0.8 * (0.9 + 0.1 * band);
            ctx.save();
            ctx.globalAlpha = band;
            const bg = ctx.createLinearGradient(W / 2 - w / 2, 0, W / 2 + w / 2, 0);
            bg.addColorStop(0, MAGENTA);
            bg.addColorStop(1, PINK);
            ctx.fillStyle = bg;
            ctx.beginPath();
            ctx.roundRect(W / 2 - w / 2, bandY - bandH / 2, w, bandH, bandH / 2);
            ctx.fill();
            text(ctx, "Ethical, legal and societal aspects, considered at every step", W / 2, bandY, 25 * k, {
                color: "#fff",
                weight: 700,
                maxWidth: w - 60 * k,
            });
            ctx.restore();
        }
    }
    //#endregion

    //#region decade: ten years on a timeline, then the numbers
    if (t >= T.decade && t < T.partners) {
        const out = 1 - ease(progress(t, T.partners - 0.45, T.partners));
        const x0 = W * 0.08;
        const x1 = W * 0.92;
        const y = safe.top + span * 0.42;
        const xOf = (year: number) => lerp(x0, x1, (year - 2016) / 10);
        const head = ease(progress(t, T.decade + 0.3, T.decade + 3.0));
        const hx = lerp(x0, x1, head);

        ctx.save();
        ctx.globalAlpha = out;
        ctx.strokeStyle = HAIR;
        ctx.lineWidth = 4 * k;
        ctx.beginPath();
        ctx.moveTo(x0, y);
        ctx.lineTo(x1, y);
        ctx.stroke();
        const g = ctx.createLinearGradient(x0, 0, x1, 0);
        g.addColorStop(0, MAGENTA);
        g.addColorStop(1, PINK);
        ctx.strokeStyle = g;
        ctx.beginPath();
        ctx.moveTo(x0, y);
        ctx.lineTo(hx, y);
        ctx.stroke();
        if (head > 0 && head < 1) dot(ctx, hx, y, 8 * k, PINK);
        ctx.restore();

        for (let year = 2016; year <= 2026; year++) {
            const x = xOf(year);
            const reached = progress(hx, x - 30 * k, x);
            const a = out * (0.35 + 0.65 * reached);
            ctx.save();
            ctx.globalAlpha = a;
            dot(ctx, x, y, 5 * k, reached >= 1 ? INK : HAIR);
            ctx.restore();
            text(ctx, String(year), x, y + 30 * k, 18 * k, { color: reached >= 1 ? INK : GREY, weight: 600, alpha: a });
        }

        MILESTONES.forEach((m) => {
            const x = xOf(m.year);
            const a = easeOut(progress(hx, x - 90 * k, x)) * out;
            if (a <= 0.003) return;
            const dir = m.up ? -1 : 1;
            const stemFrom = y + dir * (m.up ? 14 : 48) * k;
            const stemTo = y + dir * (m.up ? 70 : 104) * k;
            ctx.save();
            ctx.globalAlpha = a;
            ctx.strokeStyle = m.color;
            ctx.lineWidth = 2 * k;
            ctx.beginPath();
            ctx.moveTo(x, stemFrom);
            ctx.lineTo(x, lerp(stemFrom, stemTo, a));
            ctx.stroke();
            dot(ctx, x, y, 11 * k * a, m.color);
            dot(ctx, x, y, 4 * k * a, "#fff");
            ctx.restore();
            const align: CanvasTextAlign = x > W * 0.7 ? "right" : "left";
            const tx = x + (align === "left" ? -6 : 6) * k;
            const titleY = m.up ? stemTo - 52 * k : stemTo + 22 * k;
            text(ctx, m.title, tx, titleY + (1 - a) * dir * -10 * k, 26 * k, { color: INK, weight: 800, align, alpha: a });
            text(ctx, m.sub, tx, titleY + 30 * k, 18 * k, { color: GREY, weight: 500, align, alpha: a, maxWidth: W * 0.36 });
        });

        // BISS in numbers, from the homepage
        const statsY = safe.top + span * 0.86;
        STATS.forEach((s, i) => {
            const x = W * (0.2 + i * 0.2);
            const a = easeOut(progress(t, T.decade + 3.2 + i * 0.25, T.decade + 3.8 + i * 0.25)) * out;
            if (a <= 0.003) return;
            const count = ease(progress(t, T.decade + 3.2 + i * 0.25, T.decade + 4.8 + i * 0.25));
            const value = s.value < 0 ? "1000s" : String(Math.round(s.value * count));
            text(ctx, value, x, statsY - 14 * k + (1 - a) * 12 * k, 50 * k, { color: ACCENTS[i], weight: 800, alpha: a });
            text(ctx, s.label, x, statsY + 30 * k, 19 * k, { color: GREY, weight: 600, alpha: a });
        });
    }
    //#endregion

    //#region partners: two marquees of logo cards, then the funders
    if (t >= T.partners && t < T.outro) {
        const out = 1 - ease(progress(t, T.outro - 0.45, T.outro));
        const gap = 22 * k;
        const h = Math.min(96 * k, span * 0.15);
        const w = h * 2.1;
        const fh = h * 1.08;
        let fw = fh * 2.1;
        // the funders' row must fit the width
        const fScale = Math.min(1, (W * 0.92) / (FUNDERS.length * (fw + gap)));
        fw *= fScale;
        const fH = fh * fScale;
        const heading = 40 * k;
        const total = heading + h + gap + h + 46 * k + heading + fH;
        let y = cy - total / 2;

        const eyebrow = (value: string, ly: number, a: number, color: string) => {
            ctx.font = `700 ${18 * k}px ${FONT}`;
            const half = ctx.measureText(value).width / 2;
            ctx.save();
            ctx.globalAlpha = a * out;
            dot(ctx, W / 2 - half - 8 * k, ly, 6 * k, color);
            ctx.restore();
            text(ctx, value, W / 2 + 8 * k, ly, 18 * k, { color: GREY, weight: 700, alpha: a * out });
        };

        eyebrow("PARTNERS", y + heading / 2 - 6 * k, progress(t, T.partners + 0.1, T.partners + 0.6), CYAN);
        y += heading;

        // two rows drifting in opposite directions; cards fly in from their side first
        const rows = [PARTNERS.filter((_, i) => i % 2 === 0), PARTNERS.filter((_, i) => i % 2 === 1)];
        const step = w + gap;
        rows.forEach((row, r) => {
            const L = row.length * step;
            const dir = r === 0 ? -1 : 1;
            const drift = (t - T.partners) * 38 * k * dir;
            const rowY = y + h / 2;
            const left = W / 2 - L / 2;
            row.forEach((p, i) => {
                const x = left + ((((i * step + drift) % L) + L) % L) + w / 2;
                if (x < -w || x > W + w) return;
                // cards nearer their entry side arrive first
                const order = dir < 0 ? x / W : 1 - x / W;
                const start = T.partners + 0.3 + r * 0.25 + order * 1.1;
                const e = easeOut(progress(t, start, start + 0.9));
                if (e <= 0.003) return;
                const fx = x - dir * (1 - e) * W * 0.45;
                // soft fade at the screen edges
                const edge = Math.min(1, Math.max(0, (fx + w * 0.35) / (W * 0.1)), Math.max(0, (W + w * 0.35 - fx) / (W * 0.1)));
                logoCard(ctx, p.name, p.logo, fx, rowY, w, h, k, e * edge * out);
            });
            y += h + gap;
        });
        y += 46 * k - gap;

        const fundersAt = T.partners + 2.6;
        eyebrow("FUNDED BY", y + heading / 2 - 6 * k, progress(t, fundersAt - 0.3, fundersAt + 0.2), MAGENTA);
        y += heading;
        const fx0 = W / 2 - (FUNDERS.length * (fw + gap) - gap) / 2;
        FUNDERS.forEach((f, i) => {
            const a = easeOut(progress(t, fundersAt + i * 0.16, fundersAt + 0.7 + i * 0.16));
            if (a <= 0.003) return;
            const x = fx0 + i * (fw + gap) + fw / 2;
            const bob = Math.sin(t * 1.6 + i * 0.9) * 3 * k;
            const fy = y + fH / 2 + (1 - a) * 40 * k + bob;
            logoCard(ctx, f.name, f.logo, x, fy, fw * (0.85 + 0.15 * a), fH * (0.85 + 0.15 * a), k, a * out, MAGENTA);
        });
    }
    //#endregion
};

const updateDom = (t: number) => {
    const next = sceneAt<Scene>(t, [
        ["intro", 0],
        ["who", T.who],
        ["disciplines", T.disciplines],
        ["themes", T.themes],
        ["how", T.how],
        ["decade", T.decade],
        ["partners", T.partners],
        ["outro", T.outro],
    ]);
    if (scene.value !== next) scene.value = next;
};

useCanvasTimeline(canvas, T.end, draw, { tick: updateDom, done: () => emit("done") });
</script>
<style scoped>
/* the player behind is dark navy; this showcase paints its own white, airy backdrop */
.about {
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse 80% 70% at 50% 40%, #ffffff, #f4f5f9);
}

/* the whole team is on the closing card: smaller faces that wrap */
.about :deep(.faces) {
    flex-wrap: wrap;
    justify-content: center;
    max-width: min(90vw, 70rem);
    row-gap: 0.6rem;
}

.about :deep(.faces img) {
    width: 3.6rem;
    height: 3.6rem;
    margin-right: -0.5rem;
}
</style>
