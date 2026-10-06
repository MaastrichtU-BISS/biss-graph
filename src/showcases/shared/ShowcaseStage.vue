<template>
    <div class="stage" :class="{ light: effectiveTheme === 'light', 'adapted-light': theme !== 'light' && effectiveTheme === 'light' }">
        <canvas ref="canvas"></canvas>

        <div class="scrim" aria-hidden="true"></div>
        <Transition name="backdrop">
            <div v-if="scene === 'outro'" class="backdrop" aria-hidden="true"></div>
        </Transition>

        <Transition name="fade">
            <ol v-if="chapter >= 0" class="chapters" aria-hidden="true">
                <li v-for="(_, i) in chapters" :key="i" :class="{ done: i < chapter, active: i === chapter }"></li>
            </ol>
        </Transition>

        <Transition name="caption" mode="out-in">
            <div v-if="scene === 'intro'" key="intro" class="intro">
                <span class="eyebrow">{{ local.eyebrow ?? eyebrow }}</span>
                <h1>{{ title }}</h1>
                <p>{{ local.tagline ?? tagline }}</p>
            </div>
            <div v-else-if="scene === 'outro'" key="outro" class="outro">
                <h1>{{ title }}</h1>
                <p>{{ local.outro ?? outro }}</p>
                <span v-if="url" class="url">{{ url }}</span>
                <div v-if="partners?.length || funders?.length" class="credits">
                    <div v-if="partners?.length" class="credit-row">
                        <span class="credit-label">{{ lang === 'nl' ? 'Partners, waaronder' : 'Partners include' }}</span>
                        <span v-for="name in partners" :key="name" class="credit-name">{{ name }}</span>
                    </div>
                    <div v-if="funders?.length" class="credit-row">
                        <span class="credit-label">{{ lang === 'nl' ? 'Gefinancierd door' : 'Funded by' }}</span>
                        <span v-for="name in funders" :key="name" class="credit-name">{{ name }}</span>
                    </div>
                </div>
                <div v-if="members.length" class="faces">
                    <img v-for="(m, i) in members" :key="m.title" :src="m.photo" :alt="m.title" decoding="async"
                        :style="{ animationDelay: `${0.5 + i * 0.07}s` }" />
                </div>
            </div>
            <p v-else-if="captions[scene]" :key="scene + lang" class="caption">
                {{ local.captions?.[scene] ?? captions[scene] }}
            </p>
        </Transition>

        <slot></slot>
    </div>
</template>
<script setup lang="ts">
import { computed, inject, ref } from "vue";
import { lang, theme as screenTheme } from "../../i18n";
import { NL, type ShowcaseTexts } from "../translations";

/**
 * The frame every project showcase shares: a full-screen canvas, a title card at the
 * start, one caption per scene and a closing card with the team.
 */
const props = defineProps<{
    /** Current scene; "intro" and "outro" show the title cards. */
    scene: string;
    captions: Record<string, string>;
    eyebrow: string;
    title: string;
    tagline: string;
    outro: string;
    url?: string;
    partners?: string[];
    funders?: string[];
    members: { photo?: string; title: string }[];
    /** "light" for a white, Brightlands-like look; the showcase paints its own background. */
    theme?: "dark" | "light";
}>();

const canvas = ref<HTMLCanvasElement>();
const effectiveTheme = computed(() => props.theme ?? screenTheme.value);

// the closing card shows the team: fetch and decode their photos from the start
for (const m of props.members) {
    if (!m.photo) continue;
    const img = new Image();
    img.decoding = "async";
    img.src = m.photo;
    img.decode().catch(() => undefined);
}

/** Translated texts for the visitor's language, if there are any for this showcase. */
const showcaseId = inject<string>("showcaseId", "");
const local = computed<ShowcaseTexts>(() => (lang.value === "nl" ? (NL[showcaseId] ?? {}) : {}));

/** One dot per captioned scene, so viewers see how far along the story is. */
const chapters = computed(() => Object.keys(props.captions));
const chapter = computed(() => chapters.value.indexOf(props.scene));
defineExpose({ canvas });
</script>
<style scoped>
.stage {
    position: absolute;
    inset: 0;
    color: #fff;
}

/* light theme: dark text on white, with a white scrim and backdrop */
.stage.light {
    color: #0b1020;
}

/* Legacy showcase art was authored on a dark canvas. Invert its luminance while
   preserving accent hues; the Brightlands BISS film already has native light art. */
.adapted-light canvas {
    filter: invert(1) hue-rotate(180deg);
}

.light .scrim {
    background: linear-gradient(to top, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.6) 60%, transparent);
}

.light .backdrop {
    background: radial-gradient(ellipse 70% 60% at 50% 45%, rgba(255, 255, 255, 0.92), rgba(246, 247, 251, 0.98));
}

.light .eyebrow,
.light .intro p,
.light .outro p {
    color: #4b5563;
}

.light .caption {
    text-shadow: none;
}

.light .chapters li {
    background: rgba(11, 16, 32, 0.18);
}

.light .chapters li.done {
    background: rgba(11, 16, 32, 0.45);
}

.light .chapters li.active {
    background: #0b1020;
}

.light .faces img {
    box-shadow: 0 0 0 3px #fff;
}

.light .url {
    background: #0b1020;
    color: #fff;
}

.light .credits {
    color: #3b4150;
}

.light .credit-name {
    border-color: rgba(11, 16, 32, 0.17);
}

canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
}

/* keeps captions legible over busy content */
.scrim {
    position: absolute;
    inset: auto 0 0 0;
    /* stops above the safe band's bottom edge (77%), so it never darkens content */
    height: 23%;
    background: linear-gradient(to top, rgba(6, 9, 20, 0.92), rgba(6, 9, 20, 0.55) 60%, transparent);
    pointer-events: none;
}

/* hides what's left of the story behind the closing card */
.backdrop {
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse 70% 60% at 50% 45%, rgba(10, 16, 40, 0.9), rgba(6, 9, 20, 0.97));
}

.backdrop-enter-active,
.backdrop-leave-active {
    transition: opacity 900ms ease;
}

.backdrop-enter-from,
.backdrop-leave-to {
    opacity: 0;
}

.chapters {
    position: absolute;
    left: 50%;
    bottom: calc(9% - 2.4rem);
    transform: translateX(-50%);
    display: flex;
    gap: 0.6rem;
    margin: 0;
    padding: 0;
    list-style: none;
}

.chapters li {
    width: 0.55rem;
    height: 0.55rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.25);
    transition: width 400ms var(--ease-out), background-color 400ms ease;
}

.chapters li.done {
    background: rgba(255, 255, 255, 0.6);
}

.chapters li.active {
    width: 2rem;
    background: #fff;
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 500ms ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

/* the title card builds up line by line */
.intro > *,
.outro > * {
    animation: rise 900ms var(--ease-out) both;
}

.intro > :nth-child(2),
.outro > :nth-child(2) {
    animation-delay: 150ms;
}

.intro > :nth-child(3),
.outro > :nth-child(3) {
    animation-delay: 300ms;
}

.outro > .url { animation-delay: 300ms; }
.outro > .credits { animation-delay: 450ms; }
.outro > .faces { animation-delay: 600ms; }

.outro .faces {
    animation: none;
}

.outro .faces img {
    animation: pop 600ms var(--ease-out) both;
}

@keyframes rise {
    from {
        opacity: 0;
        transform: translateY(1.2rem);
        filter: blur(6px);
    }
}

@keyframes pop {
    from {
        opacity: 0;
        transform: scale(0.6);
    }
}

.intro,
.outro {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1.2rem;
    padding: 0 6%;
    text-align: center;
}

.eyebrow {
    font-size: 1.2rem;
    color: rgba(255, 255, 255, 0.7);
}

h1 {
    margin: 0;
    font-size: min(5.5rem, 9vw);
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1;
}

.intro p,
.outro p {
    margin: 0;
    font-size: 1.8rem;
    color: rgba(255, 255, 255, 0.8);
    text-wrap: balance;
}

.faces {
    display: flex;
    margin-top: 1.5rem;
}

.credits {
    display: grid;
    gap: 0.6rem;
    width: min(82%, 70rem);
    color: rgba(255, 255, 255, 0.76);
}

.credit-row {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: center;
    gap: 0.4rem 0.65rem;
    font-size: 1rem;
}

.credit-label {
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.8rem;
}

.credit-name {
    padding: 0.25rem 0.55rem;
    border: 1px solid rgba(255, 255, 255, 0.22);
    border-radius: 999px;
}

.faces img {
    width: 5rem;
    height: 5rem;
    margin-right: -0.8rem;
    border-radius: 999px;
    object-fit: cover;
    box-shadow: 0 0 0 3px #060914;
}

.url {
    margin-top: 1rem;
    padding: 0.6rem 1.4rem;
    border-radius: 999px;
    background: #fff;
    color: #000;
    font-size: 1.4rem;
    font-weight: 600;
}

.caption {
    position: absolute;
    left: 50%;
    bottom: 9%;
    transform: translateX(-50%);
    width: min(90%, 62rem);
    margin: 0;
    text-align: center;
    font-size: 2.3rem;
    font-weight: 600;
    line-height: 1.25;
    text-shadow: 0 2px 16px rgba(0, 0, 0, 0.6);
    text-wrap: balance;
}

.caption-enter-active {
    transition: opacity 500ms ease, transform 600ms var(--ease-out);
}

.caption-leave-active {
    transition: opacity 300ms ease;
}

.caption-enter-from {
    opacity: 0;
    transform: translate(-50%, 1rem);
}

.intro.caption-enter-from,
.outro.caption-enter-from {
    transform: scale(0.97);
}

.caption-leave-to {
    opacity: 0;
}
</style>
