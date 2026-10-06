<template>
    <div class="kiosk" :class="{ 'has-panel': !!selectedId }">
        <main ref="stage" class="stage" :class="{ ready }"></main>
        <div class="vignette" aria-hidden="true"></div>

        <header class="brand">
            <img :src="logo" alt="BISS" class="logo" />
            <div class="brand-text">
                <h1>{{ t.title }}</h1>
                <p>{{ t.subtitle }}</p>
            </div>
        </header>

        <Transition name="fade">
            <div v-if="!ready" class="boot-loader" role="status">
                <div class="boot-orbit"><span></span><span></span><span></span></div>
                Loading the BISS team…
            </div>
        </Transition>

        <Transition name="fade">
            <AttractOverlay v-if="ready && mode === 'attract'" :spotlight-id="spotlightId" :highlight="highlight"
                @select="select" />
        </Transition>

        <Transition name="fade">
            <div v-if="mode === 'explore'" class="controls">
                <div class="dock">
                    <button class="ghost" @click="openBrowse('people')">
                        <Icon name="people" /> {{ t.allPeople }}
                    </button>
                    <button class="ghost" @click="openBrowse('projects')">
                        <Icon name="projects" /> {{ t.allProjects }}
                    </button>
                    <button class="ghost" :class="{ active: filterOpen || filterActive }"
                        @click="filterOpen = !filterOpen">
                        <Icon name="filter" /> {{ t.filter }}
                        <span v-if="filterActive" class="badge" aria-hidden="true"></span>
                    </button>
                    <button v-if="about" class="ghost" @click="playAbout">
                        <Icon name="play" /> {{ t.whatIsBiss }}
                    </button>
                </div>

                <Transition name="pop">
                    <FilterPanel v-if="filterOpen" v-model="filters" class="filters" @close="filterOpen = false" />
                </Transition>

                <Transition name="fade">
                    <ul v-if="!selectedId && !browseOpen && !filterOpen" class="hints">
                        <li>
                            <Icon name="tap" /> {{ t.hintTap }}
                        </li>
                        <li>
                            <Icon name="drag" /> {{ t.hintDrag }}
                        </li>
                        <li>
                            <Icon name="pinch" /> {{ t.hintPinch }}
                        </li>
                    </ul>
                </Transition>

                <div class="top-right">
                    <button class="ghost" @click="enterAttract">
                        <Icon name="overview" /> {{ t.overview }}
                    </button>
                    <span class="divider" aria-hidden="true"></span>
                    <div class="settings">
                        <button class="ghost setting" :aria-pressed="lang === 'nl'"
                            :aria-label="lang === 'en' ? 'Nederlands' : 'English'" @click="toggleLanguage">
                            <span :class="{ on: lang === 'en' }">EN</span>
                            <span :class="{ on: lang === 'nl' }">NL</span>
                        </button>
                        <button class="ghost setting" :class="{ active: largeText }" :aria-pressed="largeText"
                            :aria-label="t.largerText" @click="largeText = !largeText">
                            <span class="aa">A<small>A</small></span>
                        </button>
                    </div>
                </div>
            </div>
        </Transition>

        <Transition name="fade">
            <aside v-if="!selectedId" class="qr">
                <img :src="qr" alt="QR code to biss-institute.com" />
                <div>
                    <span>{{ t.scanToVisit }}</span>
                    <strong>biss-institute.com</strong>
                </div>
            </aside>
        </Transition>

        <Transition name="panel">
            <DetailPanel v-if="selectedId" :id="selectedId" :can-go-back="history.length > 0"
                :showcases="selectedShowcases" @select="select" @back="back" @close="resetView" @open="openInfo"
                @play="playFromPanel" />
        </Transition>

        <Transition name="sheet">
            <BrowseDrawer v-if="browseOpen" v-model:tab="browseTab" @select="select" @close="browseOpen = false" />
        </Transition>

        <Transition name="showcase">
            <ShowcasePlayer v-if="showcase" :showcase="showcase" :members="showcaseMembers" @done="onShowcaseDone" />
        </Transition>

        <Transition name="fade">
            <InfoSheet v-if="infoUrl" :url="infoUrl" :title="infoTitle" @close="infoUrl = null" />
        </Transition>
    </div>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import Icon from "./Icon.vue";
import AttractOverlay from "./AttractOverlay.vue";
import DetailPanel from "./DetailPanel.vue";
import BrowseDrawer from "./BrowseDrawer.vue";
import InfoSheet from "./InfoSheet.vue";
import ShowcasePlayer from "./ShowcasePlayer.vue";
import FilterPanel, { type Filters, emptyFilters, filterMatches } from "./FilterPanel.vue";
import { aboutShowcase, showcaseById, showcasesForProject, type Showcase } from "../showcases";
import { lang, largeText, resetSettings, t } from "../i18n";
import { sound } from "../sound";
import { GraphScene, type ScreenRect } from "../scene/graphScene";
import { entities, graphData, highlights, people, titleOf } from "../data/graph";
import { syncWithWebsite } from "../data/sync";
import { RandomVisitor } from "../utils/visitor";
import type { BrowseTab, Highlight } from "../types/graph";
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
/** A project's showcase plays at most this often in the idle loop. */
const SHOWCASE_COOLDOWN_MS = 10 * 60 * 1000;
/** Every this many spotlights, the idle loop shows a news post instead. */
const HIGHLIGHT_EVERY = 4;
/** `?showcase=<id>` plays that showcase right away, for trying one out. */
const SHOWCASE_PARAM = new URLSearchParams(location.search).get("showcase");
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
const infoTitle = computed(() => (selectedId.value ? titleOf(entities[selectedId.value], lang.value) : ""));
const filterOpen = ref(false);
const filters = ref<Filters>(emptyFilters());
const filterActive = computed(() => !!filterMatches(filters.value));
/** The news post shown instead of a spotlight now and then in the idle loop. */
const highlight = ref<Highlight | null>(null);
const about = aboutShowcase();

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
    const rects = [".brand", ".cta", ".qr", ".spotlight", ".news"]
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
    [".brand", ".dock", ".top-right"]
        .map((selector) => document.querySelector(selector)?.getBoundingClientRect())
        .filter((r): r is DOMRect => !!r && r.width > 0)
        .map((r) => ({
            x0: r.left / window.innerWidth,
            y0: r.top / window.innerHeight,
            x1: r.right / window.innerWidth,
            y1: r.bottom / window.innerHeight,
        }));

let spotlightCount = 0;
let highlightIndex = Math.floor(Math.random() * Math.max(1, highlights.length));

const nextSpotlight = () => {
    spotlightCount++;
    if (highlights.length && spotlightCount % HIGHLIGHT_EVERY === 0) {
        // a news post, with the whole graph turning slowly behind it
        highlight.value = highlights[highlightIndex++ % highlights.length];
        spotlightId.value = null;
        scene?.focus(null);
        scene?.overview(2200);
        scene?.setAutoRotate(true);
        return;
    }
    highlight.value = null;
    visitor.moveNext();
    spotlightId.value = visitor.getCurrentNodeId();
    scene?.spotlight(spotlightId.value, overlayRects());
};

//#region Showcases

const showcase = ref<Showcase | null>(null);
/** The project whose showcase is playing; a touch opens it. */
const showcaseProject = ref<string | null>(null);
const lastPlayed = new Map<string, number>();
// the general BISS animation first plays after a cooldown, not as the very first thing
if (about) lastPlayed.set(about.id, Date.now());

const showcaseMembers = computed(() =>
    showcase.value?.id === about?.id
        ? people
        : showcaseProject.value
          ? (entities[showcaseProject.value]?.connections.map((id) => entities[id]) ?? [])
          : []
);

const playAbout = () => {
    if (!about) return;
    sound.open();
    playShowcase(about, null);
};

/**
 * A showcase for the spotlighted project that hasn't played recently, if any. Projects
 * with several take turns: the one played longest ago goes first.
 */
const dueShowcase = (id: string | null) =>
    [...(id ? showcasesForProject(entities[id]?.infoUrl) : []), ...(about ? [about] : [])]
        .map((s) => ({ s, at: lastPlayed.get(s.id) ?? -Infinity }))
        .filter(({ at }) => Date.now() - at > SHOWCASE_COOLDOWN_MS)
        .sort((a, b) => a.at - b.at)[0]?.s;

const selectedShowcases = computed(() =>
    selectedId.value ? showcasesForProject(entities[selectedId.value]?.infoUrl) : []
);

const playFromPanel = (id: string) => {
    const s = showcaseById(id);
    if (!s) return;
    sound.open();
    playShowcase(s, selectedId.value);
};

const playShowcase = (s: Showcase, project: string | null) => {
    showcaseProject.value = project;
    showcase.value = s;
};

const stopShowcase = () => {
    if (!showcase.value) return;
    lastPlayed.set(showcase.value.id, Date.now());
    showcase.value = null;
    // the idle timeout counts from the end of the animation
    lastInteraction = Date.now();
};

const onShowcaseDone = () => {
    stopShowcase();
    if (mode.value === "attract") scheduleSpotlight(1500);
};

//#endregion

const scheduleSpotlight = (delay: number) => {
    window.clearTimeout(spotlightTimer);
    spotlightTimer = window.setTimeout(() => {
        if (mode.value !== "attract") return;
        nextSpotlight();
        const due = dueShowcase(spotlightId.value);
        if (due) {
            // let the camera arrive at the project first; the loop resumes when it ends
            const project = due === about ? null : spotlightId.value;
            spotlightTimer = window.setTimeout(() => mode.value === "attract" && playShowcase(due, project), 3500);
            return;
        }
        const [min, max] = SPOTLIGHT_MS;
        scheduleSpotlight(min + Math.random() * (max - min));
    }, delay);
};

const enterAttract = () => {
    if (dataUpdated) return location.reload();
    stopShowcase();
    mode.value = "attract";
    selectedId.value = null;
    history.value = [];
    browseOpen.value = false;
    infoUrl.value = null;
    // the next visitor starts in English, with normal text and no filter
    resetSettings();
    filterOpen.value = false;
    filters.value = emptyFilters();
    highlight.value = null;
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
    stopShowcase();
    window.clearTimeout(spotlightTimer);
    spotlightId.value = null;
    highlight.value = null;
    scene?.setAutoRotate(false);
    scene?.focus(null);
};

const markInteraction = (e: Event) => {
    lastInteraction = Date.now();
    // a tap on the spotlight card selects what's in it; leaving the idle loop here would
    // remove the card before its click lands
    if ((e.target as Element | null)?.closest?.(".spotlight, .news")) return;
    // touching a showcase stops it and opens the project it is about
    const project = showcase.value ? showcaseProject.value : null;
    if (mode.value === "attract" && ready.value) enterExplore();
    else stopShowcase();
    if (project && project !== selectedId.value) select(project);
};

const checkIdle = () => {
    if (mode.value !== "explore" || showcase.value) return;
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
    filterOpen.value = false;
    sound.select();
    scene?.focus(id);
    scene?.flyTo(id, panelFraction(), 1400, exploreOverlays());
};

const back = () => {
    const previous = history.value.pop();
    if (previous) select(previous, false);
};

/** Nothing in focus means the overview, orbiting the centre of the graph. */
const resetView = () => {
    if (selectedId.value) sound.close();
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
    // one panel at a time: the drawer replaces whatever is open on the side
    if (selectedId.value) {
        selectedId.value = null;
        history.value = [];
        scene?.focus(null);
    }
    sound.open();
    browseTab.value = tab;
    browseOpen.value = true;
    filterOpen.value = false;
};

const toggleLanguage = () => {
    lang.value = lang.value === "en" ? "nl" : "en";
};

watch(lang, (l) => scene?.setLanguage(l));
watch(filters, (f) => scene?.setFilter(filterMatches(f)), { deep: true });

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
    const requested = showcaseById(SHOWCASE_PARAM);
    if (requested) {
        window.clearTimeout(spotlightTimer);
        const project = Object.values(entities).find((e) => showcasesForProject(e.infoUrl).includes(requested))?.id ?? null;
        playShowcase(requested, project);
    }
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
    gap: 0.2rem;
}

/* the controls stay quiet on the night sky: one dark translucent bar each, no white blocks */
.dock,
.top-right {
    align-items: center;
    padding: 0.35rem;
    border-radius: 999px;
    background: rgba(12, 17, 38, 0.72);
    border: 1px solid rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
}

.ghost {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 3rem;
    padding: 0 1.1rem;
    border-radius: 999px;
    color: rgba(255, 255, 255, 0.82);
    font-size: 1rem;
    font-weight: 500;
    transition: background-color 140ms ease, color 140ms ease, transform 140ms var(--ease-out);
}

.ghost:active {
    transform: scale(0.96);
    background: rgba(255, 255, 255, 0.12);
}

.ghost.active {
    background: #fff;
    color: #000;
}

.divider {
    width: 1px;
    height: 1.6rem;
    margin: 0 0.2rem;
    background: rgba(255, 255, 255, 0.15);
}

/* above the dock, so the two never collide however long the button labels get */
.hints {
    position: absolute;
    left: calc(var(--gap) + 1.2rem);
    bottom: calc(var(--gap) + 4.4rem);
    display: flex;
    gap: 1.6rem;
    margin: 0;
    padding: 0;
    list-style: none;
    color: rgba(255, 255, 255, 0.55);
    font-size: 0.95rem;
    white-space: nowrap;
    text-shadow: 0 1px 8px rgba(0, 0, 0, 0.8);
    pointer-events: none !important;
}

.hints li {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.hints li:first-child {
    color: #fff;
    font-weight: 500;
}

.top-right {
    position: absolute;
    top: var(--gap);
    right: var(--gap);
    display: flex;
    gap: 0.2rem;
    transition: right 500ms var(--ease-out);
}

.has-panel .top-right {
    right: calc(var(--panel-width) + var(--gap) * 2);
}

.settings {
    display: flex;
    gap: 0.2rem;
}

.setting {
    padding: 0 0.9rem;
    gap: 0.35rem;
}

.setting span {
    color: rgba(255, 255, 255, 0.45);
}

.setting span.on {
    color: #fff;
    font-weight: 700;
}

.aa {
    font-weight: 700;
    color: inherit !important;
}

.aa small {
    font-size: 0.7em;
}

.badge {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 999px;
    background: #ff4d4f;
}

.filters {
    position: absolute;
    left: var(--gap);
    bottom: calc(var(--gap) + 4.4rem);
}

.pop-enter-active,
.pop-leave-active {
    transition: opacity 200ms ease, transform 260ms var(--ease-out);
}

.pop-enter-from,
.pop-leave-to {
    opacity: 0;
    transform: translateY(0.75rem);
}

.qr {
    position: absolute;
    right: var(--gap);
    bottom: var(--gap);
    z-index: 15;
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.6rem 1.3rem 0.6rem 0.6rem;
    border-radius: 1.1rem;
    background: rgba(12, 17, 38, 0.72);
    border: 1px solid rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    color: #fff;
}

.qr img {
    width: 5.2rem;
    height: 5.2rem;
    padding: 0.3rem;
    border-radius: 0.6rem;
    background: #fff;
}

.qr div {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.qr span {
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.6);
}

.qr strong {
    font-size: 1.1rem;
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

.showcase-enter-active {
    transition: opacity 900ms ease;
}

.showcase-leave-active {
    transition: opacity 600ms ease;
}

.showcase-enter-from,
.showcase-leave-to {
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
