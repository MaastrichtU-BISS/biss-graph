<template>
    <ShowcaseStage ref="stage" :scene="scene" :captions="captions" eyebrow="Part of Legal Research Software at BISS"
        title="Case Law Explorer" tagline="Discover precedents in a network of court decisions"
        outro="Open source, built at BISS for legal researchers and practitioners." url="caselawexplorer.tech"
        :members="members">
        <Transition name="search">
            <div v-if="searchShown" class="search">
                <Icon name="search" />
                <span>{{ searchText }}<i class="caret"></i></span>
            </div>
        </Transition>
    </ShowcaseStage>
</template>
<script setup lang="ts">
import { computed, ref } from "vue";
import Icon from "../../components/Icon.vue";
import ShowcaseStage from "../shared/ShowcaseStage.vue";
import { paper, paperLine } from "../shared/paper";
import { callout as label, clamp01, ease, easeOut, FONT, Frame, lerp, MONO, progress, useCanvasTimeline } from "../shared/anim";
import { buildNetwork, COURTS, Decision, FIRST_YEAR, LAST_YEAR, SEARCH_TOPIC, TOPICS } from "./network";

defineProps<{ members: { photo?: string; title: string }[] }>();
const emit = defineEmits<{ done: [] }>();

/** Seconds into the animation at which each part starts. */
const T = {
    cite: 3.5,
    gather: 10,
    hubs: 16.5,
    search: 22,
    time: 29,
    outro: 34,
    end: 40,
};

type Scene = "intro" | "cite" | "gather" | "hubs" | "search" | "time" | "outro";
const captions: Record<string, string> = {
    cite: "Every court decision cites earlier ones.",
    gather: "Case Law Explorer gathers decisions from Dutch and European courts…",
    hubs: "…and links them into one citation network. The most-cited decisions stand out.",
    search: "Search an area of law, then follow its precedents back to the source.",
    time: "And see how case law develops over time.",
};

const SEARCH_WORD = TOPICS[SEARCH_TOPIC];
const ACCENT = "#6cb8ff";

const stage = ref<InstanceType<typeof ShowcaseStage>>();
const canvas = computed(() => stage.value?.canvas);
const scene = ref<Scene>("intro");
const searchShown = ref(false);
const searchText = ref("");

const net = buildNetwork();
const { decisions, links, seed, hubs, path } = net;
const courtColor = Object.fromEntries(COURTS.map((c) => [c.id, c.color]));
const seedDecision = decisions[seed];
const level1 = seedDecision.cites.slice(0, 6).map((i) => decisions[i]);
const level2 = level1
    .flatMap((d, j) => d.cites.slice(0, 3).map((i) => ({ d: decisions[i], parent: j })))
    // a decision cited at both levels is introduced once, at the first level
    .filter((l, i, all) => !level1.includes(l.d) && all.findIndex((o) => o.d === l.d) === i);
const introduced = new Set([seed, ...level1.map((d) => d.index), ...level2.map((l) => l.d.index)]);

// the rest arrive in chronological order while the network forms
const rest = decisions.filter((d) => !introduced.has(d.index));
const birth = new Map<number, number>([
    [seed, T.cite + 0.5],
    ...level1.map((d, j) => [d.index, T.cite + 1.7 + j * 0.35] as [number, number]),
    ...level2.map((l, j) => [l.d.index, T.cite + 4.1 + j * 0.05] as [number, number]),
    ...rest.map((d, i) => [d.index, T.gather + 0.6 + (i / rest.length) * 4.6] as [number, number]),
]);

/** Time between revealing each step of the precedent chain, so it ends before the timeline. */
const stepGap = Math.min(0.6, 3.4 / path.length);

const draw = ({ ctx, t, W, H, k, safe }: Frame) => {
    const span = safe.bottom - safe.top;
    const cx = W / 2;
    const cy = safe.top + span * 0.5;
    const netPos = (d: Decision) => ({ x: cx + d.net.x * Math.min(W * 0.36, span * 0.95), y: cy + d.net.y * span * 0.44 });
    const timePos = (d: Decision) => ({ x: cx + d.time.x * W * 0.36, y: cy + d.time.y * span * 0.36 });

    // positions while a single decision and its citations are introduced
    const ringRadius = span * 0.36;
    const ring = (j: number) => {
        const a = -Math.PI / 2 + (j / level1.length) * Math.PI * 2;
        return { x: cx + Math.cos(a) * ringRadius * 1.25, y: cy + Math.sin(a) * ringRadius };
    };
    const introPos = new Map<number, { x: number; y: number }>([[seed, { x: cx, y: cy }]]);
    level1.forEach((d, j) => introPos.set(d.index, ring(j)));
    level2.forEach(({ d, parent }, j) => {
        if (introPos.has(d.index)) return;
        const p = ring(parent);
        const a = Math.atan2(p.y - cy, p.x - cx) + ((j % 3) - 1) * 0.5;
        introPos.set(d.index, { x: p.x + Math.cos(a) * span * 0.16, y: p.y + Math.sin(a) * span * 0.16 });
    });
    const sources = Object.fromEntries(COURTS.map((c, i) => [c.id, { x: -40, y: H * (0.25 + i * 0.2) }]));

    const toNetwork = ease(progress(t, T.gather + 0.2, T.gather + 1.6));
    const toTimeline = ease(progress(t, T.time + 0.2, T.time + 2.2));
    const grow = ease(progress(t, T.hubs + 0.1, T.hubs + 1.7));
    const highlight = ease(progress(t, T.search + 1.6, T.search + 2.3)) * (1 - progress(t, T.outro, T.outro + 1));
    const dimAll = 1 - 0.88 * progress(t, T.outro, T.outro + 1);
    // zoom in on the searched area of law, and back out for the timeline
    const zoom = ease(progress(t, T.search + 1.8, T.search + 3)) * (1 - toTimeline);
    const view = (p: { x: number; y: number }) => ({
        x: cx + (p.x - topicCenter.x) * (1 + 0.8 * zoom) + (topicCenter.x - cx) * (1 - zoom),
        y: cy + (p.y - topicCenter.y) * (1 + 0.8 * zoom) + (topicCenter.y - cy) * (1 - zoom),
    });
    const topicNodes = decisions.filter((d) => d.topic === SEARCH_TOPIC).map(netPos);
    const topicCenter = {
        x: topicNodes.reduce((s, p) => s + p.x, 0) / topicNodes.length,
        y: topicNodes.reduce((s, p) => s + p.y, 0) / topicNodes.length,
    };

    const position = (d: Decision) => {
        const born = birth.get(d.index)!;
        const target = netPos(d);
        let p: { x: number; y: number };
        if (introPos.has(d.index)) {
            const intro = introPos.get(d.index)!;
            p = { x: lerp(intro.x, target.x, toNetwork), y: lerp(intro.y, target.y, toNetwork) };
        } else {
            const from = sources[d.court];
            const f = easeOut(progress(t, born, born + 1.2));
            p = { x: lerp(from.x, target.x, f), y: lerp(from.y, target.y, f) };
        }
        p = view(p);
        if (toTimeline > 0) {
            const tp = timePos(d);
            p = { x: lerp(p.x, tp.x, toTimeline), y: lerp(p.y, tp.y, toTimeline) };
        }
        return p;
    };
    const pos = decisions.map(position);
    const visible = (d: Decision) => t >= birth.get(d.index)!;
    const nodeAlpha = (d: Decision) => {
        const searched = d.topic === SEARCH_TOPIC ? 1 : 1 - 0.85 * highlight;
        return clamp01((t - birth.get(d.index)!) / 0.4) * searched * dimAll;
    };

    // a legend of the courts while decisions stream in, in a row above the network
    const sourceLabels = progress(t, T.gather + 0.4, T.gather + 1) * (1 - progress(t, T.hubs + 1, T.hubs + 1.8));
    if (sourceLabels > 0) {
        ctx.font = `600 ${20 * k}px ${FONT}`;
        ctx.textBaseline = "middle";
        ctx.textAlign = "left";
        const widths = COURTS.map((c) => ctx.measureText(c.label).width + 24 * k);
        const gap = 36 * k;
        let x = cx - (widths.reduce((a, b) => a + b, 0) + gap * (COURTS.length - 1)) / 2;
        const y = H * 0.05;
        COURTS.forEach((c, i) => {
            ctx.globalAlpha = sourceLabels;
            ctx.fillStyle = c.color;
            ctx.beginPath();
            ctx.arc(x + 7 * k, y, 7 * k, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "rgba(255,255,255,0.85)";
            ctx.fillText(c.label, x + 24 * k, y);
            x += widths[i] + gap;
        });
    }

    // citations
    const introEdges = 1 - progress(t, T.gather + 0.2, T.gather + 0.9);
    ctx.lineWidth = Math.max(1, 1.1 * k);
    for (const l of links) {
        const a = decisions[l.from];
        const b = decisions[l.to];
        if (!visible(a) || !visible(b)) continue;
        const appear = Math.max(birth.get(l.from)!, birth.get(l.to)!) + 0.4;
        let alpha = clamp01((t - appear) / 0.8) * 0.16;
        if (introduced.has(l.from) && introduced.has(l.to)) alpha *= 1 - introEdges;
        const inTopic = a.topic === SEARCH_TOPIC && b.topic === SEARCH_TOPIC;
        alpha *= inTopic ? 1 + 1.6 * highlight : 1 - 0.8 * highlight;
        alpha *= dimAll;
        if (alpha <= 0.003) continue;
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = inTopic && highlight > 0 ? ACCENT : "#9fb6ff";
        ctx.beginPath();
        ctx.moveTo(pos[l.from].x, pos[l.from].y);
        ctx.lineTo(pos[l.to].x, pos[l.to].y);
        ctx.stroke();
    }

    // the first decision's citations, drawn as growing arrows
    if (introEdges > 0) {
        const arrow = (from: { x: number; y: number }, to: { x: number; y: number }, f: number, width: number, gap: number) => {
            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const len = Math.hypot(dx, dy);
            const ux = dx / len;
            const uy = dy / len;
            const sx = from.x + ux * gap;
            const sy = from.y + uy * gap;
            const ex = lerp(sx, to.x - ux * gap, f);
            const ey = lerp(sy, to.y - uy * gap, f);
            ctx.lineWidth = width;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(ex, ey);
            ctx.stroke();
            if (f > 0.95) {
                const h = width * 4;
                ctx.beginPath();
                ctx.moveTo(ex, ey);
                ctx.lineTo(ex - ux * h - uy * h * 0.6, ey - uy * h + ux * h * 0.6);
                ctx.lineTo(ex - ux * h + uy * h * 0.6, ey - uy * h - ux * h * 0.6);
                ctx.closePath();
                ctx.fill();
            }
        };
        ctx.strokeStyle = ctx.fillStyle = ACCENT;
        level1.forEach((d) => {
            const start = birth.get(d.index)! - 0.3;
            ctx.globalAlpha = 0.9 * introEdges;
            arrow(pos[seed], pos[d.index], easeOut(progress(t, start, start + 0.5)), 2.4 * k, 70 * k);
        });
        level2.forEach(({ d, parent }) => {
            const start = birth.get(d.index)! - 0.2;
            ctx.globalAlpha = 0.55 * introEdges;
            arrow(pos[level1[parent].index], pos[d.index], easeOut(progress(t, start, start + 0.4)), 1.4 * k, 40 * k);
        });
    }

    // decisions
    const asDots = progress(t, T.gather + 0.3, T.gather + 0.9);
    for (const d of decisions) {
        if (!visible(d)) continue;
        const isCard = d.index === seed || level1.includes(d);
        const alpha = nodeAlpha(d) * (isCard ? asDots : 1);
        if (alpha <= 0.003) continue;
        const r = (2.6 + grow * Math.sqrt(d.citedBy) * 1.6) * k * (1 + 0.35 * zoom);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = courtColor[d.court];
        ctx.beginPath();
        ctx.arc(pos[d.index].x, pos[d.index].y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    // decisions as documents while the idea is introduced
    if (asDots < 1) {
        const card = (d: Decision, w: number, h: number, scale: number, label: boolean) => {
            const p = pos[d.index];
            const cw = w * scale;
            const ch = h * scale;
            ctx.save();
            ctx.globalAlpha = (1 - asDots) * clamp01(scale * 1.4);
            ctx.translate(p.x - cw / 2, p.y - ch / 2);
            ctx.fillStyle = paper();
            ctx.beginPath();
            ctx.roundRect(0, 0, cw, ch, 6 * k);
            ctx.fill();
            ctx.fillStyle = courtColor[d.court];
            ctx.fillRect(0, 0, cw, ch * 0.08);
            ctx.fillStyle = paperLine();
            for (let i = 0; i < 6; i++) {
                const lw = cw * (i === 5 ? 0.45 : 0.76);
                ctx.fillRect(cw * 0.12, ch * (0.22 + i * 0.11), lw, Math.max(1, ch * 0.035));
            }
            ctx.restore();
            if (label) {
                ctx.globalAlpha = (1 - asDots) * clamp01(scale);
                ctx.fillStyle = "rgba(255,255,255,0.85)";
                ctx.font = `500 ${15 * k}px ${MONO}`;
                ctx.textAlign = "center";
                ctx.textBaseline = "top";
                ctx.fillText(d.ecli, p.x, p.y + ch / 2 + 10 * k);
                ctx.textAlign = "left";
            }
        };
        level1.forEach((d) => {
            const born = birth.get(d.index)!;
            card(d, 70 * k, 88 * k, easeOut(progress(t, born, born + 0.4)) * (1 - asDots * 0.8), true);
        });
        const born = birth.get(seed)!;
        card(seedDecision, 120 * k, 152 * k, easeOut(progress(t, born, born + 0.5)) * (1 - asDots * 0.8), true);
    }

    // landmark decisions
    const hubAlpha = progress(t, T.hubs + 1.2, T.hubs + 2) * (1 - progress(t, T.search, T.search + 0.6));
    if (hubAlpha > 0) {
        hubs.forEach((i, rank) => {
            const d = decisions[i];
            const p = pos[i];
            const r = (2.6 + Math.sqrt(d.citedBy) * 1.6) * k;
            const pulse = 1 + 0.15 * Math.sin(t * 4 + rank);
            ctx.globalAlpha = hubAlpha;
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 2 * k;
            ctx.beginPath();
            ctx.arc(p.x, p.y, (r + 9 * k) * pulse, 0, Math.PI * 2);
            ctx.stroke();
            if (rank === 0) label(ctx, p.x, p.y - r - 16 * k, "Most-cited decision", "a landmark ruling", k);
        });
    }

    // a chain of precedents in the searched area of law
    const pathStart = T.search + 2.8;
    path.forEach((i, step) => {
        const d = decisions[i];
        const shown = progress(t, pathStart + step * stepGap, pathStart + step * stepGap + 0.4) * dimAll;
        if (shown <= 0) return;
        const p = pos[i];
        if (step < path.length - 1) {
            const n = pos[path[step + 1]];
            const f = easeOut(progress(t, pathStart + step * stepGap + 0.2, pathStart + step * stepGap + 0.7));
            ctx.globalAlpha = shown;
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 3 * k;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(lerp(p.x, n.x, f), lerp(p.y, n.y, f));
            ctx.stroke();
        }
        const r = (2.6 + Math.sqrt(d.citedBy) * 1.6) * k * (1 + 0.35 * zoom) + 4 * k;
        ctx.globalAlpha = shown;
        ctx.fillStyle = "#fff";
        ctx.shadowColor = ACCENT;
        ctx.shadowBlur = 18 * k;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        // newest below, oldest above, so the two callouts never collide
        const callout = shown * (1 - progress(t, T.outro - 0.5, T.outro));
        if (step === 0) label(ctx, p.x, p.y + r + 72 * k, `${d.year} decision`, "starts here", k, callout);
        if (step === path.length - 1) label(ctx, p.x, p.y - r - 14 * k, "Original precedent", `${d.year}`, k, callout);
    });

    // timeline axis and areas of law
    const axis = progress(t, T.time + 1.6, T.time + 2.4) * dimAll;
    if (axis > 0) {
        const y = cy + span * 0.43;
        const x0 = cx - W * 0.36;
        const x1 = cx + W * 0.36;
        ctx.globalAlpha = axis * 0.8;
        ctx.strokeStyle = "rgba(255,255,255,0.5)";
        ctx.lineWidth = 1.5 * k;
        ctx.beginPath();
        ctx.moveTo(x0, y);
        ctx.lineTo(x1, y);
        ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.75)";
        ctx.font = `500 ${17 * k}px ${FONT}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        for (let year = FIRST_YEAR; year <= LAST_YEAR; year += 5) {
            const x = lerp(x0, x1, (year - FIRST_YEAR) / (LAST_YEAR - FIRST_YEAR));
            ctx.fillRect(x - 0.75 * k, y - 6 * k, 1.5 * k, 12 * k);
            ctx.fillText(String(year), x, y + 12 * k);
        }
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        TOPICS.forEach((topic, i) => {
            const band = cy + (-1 + (2 / TOPICS.length) * (i + 0.5)) * span * 0.36;
            ctx.fillStyle = i === SEARCH_TOPIC ? "#fff" : "rgba(255,255,255,0.55)";
            ctx.fillText(topic[0].toUpperCase() + topic.slice(1), x0 - 24 * k, band);
        });
        ctx.textAlign = "left";
    }
    ctx.globalAlpha = 1;
};

/** Captions, search box and outro are DOM; only touch Vue state when something changes. */
const updateDom = (t: number) => {
    const next: Scene =
        t < T.cite ? "intro"
            : t < T.gather ? "cite"
                : t < T.hubs ? "gather"
                    : t < T.search ? "hubs"
                        : t < T.time ? "search"
                            : t < T.outro ? "time"
                                : "outro";
    if (scene.value !== next) scene.value = next;
    const shown = t >= T.search + 0.2 && t < T.time + 0.5;
    if (searchShown.value !== shown) searchShown.value = shown;
    const typed = SEARCH_WORD.slice(0, Math.floor(clamp01((t - T.search - 0.6) / 0.9) * SEARCH_WORD.length));
    if (searchText.value !== typed) searchText.value = typed;
};

useCanvasTimeline(canvas, T.end, draw, { tick: updateDom, done: () => emit("done") });
</script>
<style scoped>










.search {
    position: absolute;
    top: 7%;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 0.9rem;
    min-width: 26rem;
    padding: 1rem 1.6rem;
    border-radius: 999px;
    background: #fff;
    color: #000;
    font-size: 1.6rem;
    font-weight: 500;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
}

.caret {
    display: inline-block;
    width: 2px;
    height: 1.1em;
    margin-left: 2px;
    vertical-align: -0.15em;
    background: #000;
    animation: blink 1s steps(1) infinite;
}

@keyframes blink {
    50% {
        opacity: 0;
    }
}

.search-enter-active,
.search-leave-active {
    transition: opacity 400ms ease, transform 500ms var(--ease-out);
}

.search-enter-from,
.search-leave-to {
    opacity: 0;
    transform: translate(-50%, -1rem);
}
</style>
