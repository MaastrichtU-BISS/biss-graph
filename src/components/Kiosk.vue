<template>
    <div class="kiosk" :class="{ 'has-panel': !!selectedId }">
        <main ref="stage" class="stage" :class="{ ready }"></main>
        <div class="vignette" aria-hidden="true"></div>

        <header class="brand">
            <img :src="logo" alt="BISS" class="logo" />
            <div class="brand-text">
                <h1>Who works on what</h1>
                <p>BISS is like the A-team, but with professors from Maastricht University</p>
            </div>
        </header>

        <Transition name="fade">
            <div v-if="!ready" class="boot-loader" role="status">
                <div class="boot-orbit"><span></span><span></span><span></span></div>
                Loading the BISS team…
            </div>
        </Transition>

        <Transition name="fade">
            <AttractOverlay v-if="ready && mode === 'attract'" :spotlight-id="spotlightId" @select="select" />
        </Transition>

        <Transition name="fade">
            <div v-if="mode === 'explore'" class="controls">
                <div class="dock">
                    <button class="btn btn-secondary" @click="openBrowse('people')">
                        <Icon name="people" /> All people
                    </button>
                    <button class="btn btn-secondary" @click="openBrowse('projects')">
                        <Icon name="projects" /> All projects
                    </button>
                </div>

                <Transition name="fade">
                    <ul v-if="!selectedId && !browseOpen" class="hints surface">
                        <li>
                            <Icon name="tap" /> Tap a face or project
                        </li>
                        <li>
                            <Icon name="drag" /> Drag to turn
                        </li>
                        <li>
                            <Icon name="pinch" /> Pinch to zoom
                        </li>
                    </ul>
                </Transition>

                <button class="btn btn-secondary reset" @click="enterAttract">
                    <Icon name="overview" /> Overview
                </button>
            </div>
        </Transition>

        <Transition name="fade">
            <aside v-if="!selectedId" class="qr surface">
                <img :src="qr" alt="QR code to biss-institute.com" />
                <div>
                    <span>Scan to visit</span>
                    <strong>biss-institute.com</strong>
                </div>
            </aside>
        </Transition>

        <Transition name="panel">
            <DetailPanel v-if="selectedId" :id="selectedId" :can-go-back="history.length > 0" @select="select"
                @back="back" @close="resetView" @open="openInfo" />
        </Transition>

        <Transition name="sheet">
            <BrowseDrawer v-if="browseOpen" v-model:tab="browseTab" @select="select" @close="browseOpen = false" />
        </Transition>

        <Transition name="fade">
            <InfoSheet v-if="infoUrl" :url="infoUrl" :title="infoTitle" @close="infoUrl = null" />
        </Transition>
    </div>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import Icon from "./Icon.vue";
import AttractOverlay from "./AttractOverlay.vue";
import DetailPanel from "./DetailPanel.vue";
import BrowseDrawer from "./BrowseDrawer.vue";
import InfoSheet from "./InfoSheet.vue";
import { GraphScene, type ScreenRect } from "../scene/graphScene";
import { entities, graphData } from "../data/graph";
import { syncWithWebsite } from "../data/sync";
import { RandomVisitor } from "../utils/visitor";
import type { BrowseTab } from "../types/graph";
import logo from "../assets/images/biss_um_logo.png";
import qr from "../assets/images/biss_qr_code.png";

/** Lets whoever sets up the screen tune timings via the URL, e.g. `?idle=60`. */
const secondsParam = (name: string, fallback: number) => {
    const value = Number(new URLSearchParams(location.search).get(name));
    return value > 0 ? value : fallback;
};

/** Back to the attract loop after this long without a touch. */
const IDLE_MS = secondsParam("idle", 45) * 1000;
/** Touches inside the website iframe can't be seen, so be more patient there. */
const IDLE_READING_MS = 150_000;
/** Each spotlight stays up for a slightly random time, so the loop doesn't feel mechanical. */
const SPOTLIGHT_MS = [10_000, 15_000];
/** How often to check biss-institute.com for changes; `?sync=0` turns it off. */
const SYNC_EVERY_MS = 6 * 60 * 60 * 1000;
const SYNC_ENABLED = new URLSearchParams(location.search).get("sync") !== "0";

const stage = ref<HTMLElement>();
const ready = ref(false);
const mode = ref<"attract" | "explore">("attract");
const spotlightId = ref<string | null>(null);
const selectedId = ref<string | null>(null);
const history = ref<string[]>([]);
const browseOpen = ref(false);
const browseTab = ref<BrowseTab>("people");
const infoUrl = ref<string | null>(null);
const infoTitle = computed(() => (selectedId.value ? entities[selectedId.value].title : ""));

let scene: GraphScene | undefined;
let lastInteraction = Date.now();
let idleTimer: number | undefined;
let spotlightTimer: number | undefined;
/** Set when the website sync delivered new data; applied by reloading once nobody is using the screen. */
let dataUpdated = false;
let syncTimer: number | undefined;
const visitor = new RandomVisitor(graphData);

/** Fraction of the screen width the detail panel covers. */
const panelFraction = () => {
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const vw = window.innerWidth;
    const gap = Math.min(Math.max(rem, 0.016 * vw), 2.5 * rem);
    const width = Math.min(Math.max(24 * rem, 0.3 * vw), 40 * rem);
    return (width + gap) / vw;
};

//#region Modes

/**
 * Screen areas covered by the idle-loop UI, so the camera can keep the spotlight clear of
 * them. The next spotlight card isn't rendered yet, so reserve room for a tall one.
 */
const overlayRects = (): ScreenRect[] => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const margin = 12;
    const rects = [".brand", ".cta", ".qr", ".spotlight"]
        .map((selector) => document.querySelector(selector)?.getBoundingClientRect())
        .filter((r): r is DOMRect => !!r && r.width > 0)
        .map((r) => ({ left: r.left, top: r.top, right: r.right, bottom: r.bottom }));
    const card = rects.find((r) => r.left < w * 0.2 && r.bottom > h * 0.8);
    const cardTop = Math.min(card?.top ?? h, h * 0.68);
    if (!card) rects.push({ left: 0, top: cardTop, right: w * 0.34, bottom: h });
    else card.top = cardTop;
    return rects.map((r) => ({
        x0: (r.left - margin) / w,
        y0: (r.top - margin) / h,
        x1: (r.right + margin) / w,
        y1: (r.bottom + margin) / h,
    }));
};

/** Controls drawn over the graph while exploring (the detail panel is accounted for separately). */
const exploreOverlays = (): ScreenRect[] =>
    [".brand", ".dock", ".reset"]
        .map((selector) => document.querySelector(selector)?.getBoundingClientRect())
        .filter((r): r is DOMRect => !!r && r.width > 0)
        .map((r) => ({
            x0: r.left / window.innerWidth,
            y0: r.top / window.innerHeight,
            x1: r.right / window.innerWidth,
            y1: r.bottom / window.innerHeight,
        }));

const nextSpotlight = () => {
    visitor.moveNext();
    spotlightId.value = visitor.getCurrentNodeId();
    scene?.spotlight(spotlightId.value, overlayRects());
};

const scheduleSpotlight = (delay: number) => {
    window.clearTimeout(spotlightTimer);
    spotlightTimer = window.setTimeout(() => {
        if (mode.value !== "attract") return;
        nextSpotlight();
        const [min, max] = SPOTLIGHT_MS;
        scheduleSpotlight(min + Math.random() * (max - min));
    }, delay);
};

const enterAttract = () => {
    if (dataUpdated) return location.reload();
    mode.value = "attract";
    selectedId.value = null;
    history.value = [];
    browseOpen.value = false;
    infoUrl.value = null;
    scene?.focus(null);
    scene?.overview(2200);
    scene?.setAutoRotate(true);

    // every return to the loop starts a fresh walk from a random node
    visitor.restart();
    spotlightId.value = null;
    scheduleSpotlight(2400);
};

const enterExplore = () => {
    mode.value = "explore";
    window.clearTimeout(spotlightTimer);
    spotlightId.value = null;
    scene?.setAutoRotate(false);
    scene?.focus(null);
};

const markInteraction = (e: Event) => {
    lastInteraction = Date.now();
    // a tap on the spotlight card selects what's in it; leaving the idle loop here would
    // remove the card before its click lands
    if ((e.target as Element | null)?.closest?.(".spotlight")) return;
    if (mode.value === "attract" && ready.value) enterExplore();
};

const checkIdle = () => {
    if (mode.value !== "explore") return;
    const limit = infoUrl.value ? IDLE_READING_MS : IDLE_MS;
    if (Date.now() - lastInteraction > limit) enterAttract();
};

//#endregion

//#region Selection

const select = (id: string, remember = true) => {
    if (mode.value === "attract") enterExplore();
    if (remember && selectedId.value && selectedId.value !== id) {
        history.value.push(selectedId.value);
    }
    selectedId.value = id;
    browseOpen.value = false;
    scene?.focus(id);
    scene?.flyTo(id, panelFraction(), 1400, exploreOverlays());
};

const back = () => {
    const previous = history.value.pop();
    if (previous) select(previous, false);
};

/** Nothing in focus means the overview, orbiting the centre of the graph. */
const resetView = () => {
    selectedId.value = null;
    history.value = [];
    scene?.focus(null);
    scene?.overview(1400);
};

const onSceneTap = (id: string | null) => {
    if (id) select(id);
    else resetView();
};

const openBrowse = (tab: BrowseTab) => {
    browseTab.value = tab;
    browseOpen.value = true;
};

const openInfo = (url: string) => {
    infoUrl.value = url;
};

//#endregion

const preventContextMenu = (e: Event) => e.preventDefault();

const sync = async () => {
    try {
        if (!(await syncWithWebsite())) return;
        dataUpdated = true;
        if (mode.value === "attract") location.reload();
    } catch (e) {
        console.warn("Website sync skipped, keeping current data:", e);
    }
};

onMounted(async () => {
    window.addEventListener("pointerdown", markInteraction, true);
    window.addEventListener("wheel", markInteraction, { capture: true, passive: true });
    window.addEventListener("keydown", markInteraction, true);
    // focus moving into the website iframe is the only signal we get from it
    window.addEventListener("blur", markInteraction);
    document.addEventListener("contextmenu", preventContextMenu);

    scene = new GraphScene(stage.value!, onSceneTap);
    await scene.init();
    if (import.meta.env.DEV) Object.assign(window, { __scene: scene });
    ready.value = true;
    enterAttract();
    idleTimer = window.setInterval(checkIdle, 1000);
    if (SYNC_ENABLED) {
        sync();
        syncTimer = window.setInterval(sync, SYNC_EVERY_MS);
    }
});

onBeforeUnmount(() => {
    window.removeEventListener("pointerdown", markInteraction, true);
    window.removeEventListener("wheel", markInteraction, true);
    window.removeEventListener("keydown", markInteraction, true);
    window.removeEventListener("blur", markInteraction);
    document.removeEventListener("contextmenu", preventContextMenu);
    window.clearInterval(idleTimer);
    window.clearInterval(syncTimer);
    window.clearTimeout(spotlightTimer);
    scene?.destroy();
});
</script>
<style scoped>
.kiosk {
    --panel-width: clamp(24rem, 30vw, 40rem);
    position: relative;
    width: 100%;
    height: 100%;
}

.stage {
    position: absolute;
    inset: 0;
    opacity: 0;
    transition: opacity 1.4s ease;
}

.stage.ready {
    opacity: 1;
}

.vignette {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
        linear-gradient(to bottom, rgba(6, 9, 20, 0.7), transparent 16%),
        linear-gradient(to top, rgba(6, 9, 20, 0.6), transparent 20%);
}

.brand {
    position: absolute;
    top: var(--gap);
    left: var(--gap);
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 1.4rem;
    color: var(--on-dark);
    pointer-events: none;
}

.logo {
    height: 4.4rem;
    width: auto;
}

.brand-text {
    padding-left: 1.4rem;
    border-left: 1px solid rgba(255, 255, 255, 0.35);
}

h1 {
    margin: 0;
    font-size: 2.2rem;
    font-weight: 600;
    line-height: 1.1;
}

.brand-text p {
    margin: 0.35rem 0 0;
    color: var(--on-dark-2);
    font-size: 1.02rem;
}

.controls {
    position: absolute;
    inset: 0;
    z-index: 20;
    pointer-events: none;
}

.controls>* {
    pointer-events: auto;
}

.dock {
    position: absolute;
    left: var(--gap);
    bottom: var(--gap);
    display: flex;
    gap: 0.6rem;
}

.dock .btn,
.reset {
    box-shadow: var(--shadow-lg);
    border-color: transparent;
}

.hints {
    position: absolute;
    left: 50%;
    bottom: var(--gap);
    transform: translateX(-50%);
    display: flex;
    gap: 2rem;
    margin: 0;
    padding: 1rem 1.8rem;
    list-style: none;
    color: var(--text-2);
    font-size: 1rem;
    white-space: nowrap;
    pointer-events: none !important;
}

.hints li {
    display: flex;
    align-items: center;
    gap: 0.55rem;
}

.hints li:first-child {
    color: var(--text);
    font-weight: 500;
}

.reset {
    position: absolute;
    top: var(--gap);
    right: var(--gap);
    transition: right 500ms var(--ease-out), transform 140ms var(--ease-out);
}

.has-panel .reset {
    right: calc(var(--panel-width) + var(--gap) * 2);
}

.qr {
    position: absolute;
    right: var(--gap);
    bottom: var(--gap);
    z-index: 15;
    display: flex;
    align-items: center;
    gap: 1.1rem;
    padding: 0.8rem 1.5rem 0.8rem 0.8rem;
}

.qr img {
    width: 6.2rem;
    height: 6.2rem;
}

.qr div {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.qr span {
    font-size: 0.9rem;
    color: var(--text-3);
}

.qr strong {
    font-size: 1.25rem;
    font-weight: 600;
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 350ms ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

.panel-enter-active {
    transition: transform 450ms var(--ease-out), opacity 250ms ease;
}

.panel-leave-active {
    transition: transform 280ms ease-in, opacity 200ms ease;
}

.panel-enter-from,
.panel-leave-to {
    transform: translateX(calc(100% + var(--gap)));
    opacity: 0;
}

.sheet-enter-active {
    transition: opacity 250ms ease;
}

.sheet-enter-active :deep(.sheet) {
    transition: transform 420ms var(--ease-out);
}

.sheet-leave-active {
    transition: opacity 200ms ease;
}

.sheet-leave-active :deep(.sheet) {
    transition: transform 220ms ease-in;
}

.sheet-enter-from,
.sheet-leave-to {
    opacity: 0;
}

.sheet-enter-from :deep(.sheet),
.sheet-leave-to :deep(.sheet) {
    transform: translateY(30%);
}
</style>
