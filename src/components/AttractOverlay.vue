<template>
    <div class="attract">
        <Transition name="spot" mode="out-in">
            <button v-if="spot" :key="spot.id" class="spotlight surface" @click="emit('select', spot.id)">
                <span class="spot-head">
                    <span class="label">{{ t.inTheSpotlight }}</span>
                    <span class="tag" :class="tagClass">{{ kind }}</span>
                </span>
                <span class="spot-main">
                    <img v-if="isPerson" :src="spot.photo" alt="" class="avatar spot-photo" />
                    <span class="spot-text">
                        <span v-if="!isPerson" class="bar" :style="{ '--tone': spot.color }"
                            aria-hidden="true"></span>
                        <span class="spot-title">{{ titleOf(spot, lang) }}</span>
                        <span class="spot-sub">{{ subtitle }}</span>
                    </span>
                </span>
                <span v-if="isPerson && related.length" class="list">
                    <span v-for="p in related.slice(0, 3)" :key="p.id" class="item" :style="{ '--tone': p.color }">
                        <span class="dot" aria-hidden="true"></span>
                        {{ titleOf(p, lang) }}
                    </span>
                    <span v-if="related.length > 3" class="item more">{{ t.more(related.length - 3) }}</span>
                </span>
                <span v-else-if="!isPerson" class="faces">
                    <img v-for="m in related.slice(0, 7)" :key="m.id" :src="m.photo" alt="" class="avatar face" />
                </span>
            </button>
            <div v-else-if="highlight" :key="highlight.url" class="news surface">
                <span class="spot-head">
                    <span class="label">{{ t.latestNews }}</span>
                    <span class="tag tag-content">BISS</span>
                </span>
                <span class="news-body">
                    <span class="news-text">{{ highlight.text }}</span>
                    <span class="news-qr">
                        <QrCode :url="highlight.url" class="qr-code" />
                        <span>{{ t.scanToRead }}</span>
                    </span>
                </span>
            </div>
        </Transition>

        <div class="cta surface">
            <span class="touch" aria-hidden="true">
                <span class="ring"></span>
                <span class="ring"></span>
                <span class="press">
                    <Icon name="tap" />
                </span>
            </span>
            <span class="cta-text">
                <span class="cta-title">{{ t.touchToExplore }}</span>
                <span class="cta-sub">{{ t.findOut }}</span>
            </span>
        </div>
    </div>
</template>
<script setup lang="ts">
import { computed } from "vue";
import Icon from "./Icon.vue";
import QrCode from "./QrCode.vue";
import { entities, isContent, projectsOf, roleOf, titleOf } from "../data/graph";
import { NodeType, type Highlight } from "../types/graph";
import { lang, t } from "../i18n";

const props = defineProps<{ spotlightId: string | null; highlight?: Highlight | null }>();
const emit = defineEmits<{ select: [id: string] }>();

const spot = computed(() => (props.spotlightId ? entities[props.spotlightId] : null));
const isPerson = computed(() => spot.value?.group === NodeType.TEAM_MEMBER);
const related = computed(() =>
    !spot.value ? [] : isPerson.value ? projectsOf(spot.value) : spot.value.connections.map((id) => entities[id])
);
const kind = computed(() => {
    const g = spot.value?.group;
    return g === NodeType.TEAM_MEMBER
        ? t.value.teamMember
        : g === NodeType.PROJECT
          ? t.value.project
          : g === NodeType.EDUCATION
            ? t.value.education
            : t.value.publication;
});
const tagClass = computed(() =>
    isPerson.value ? "tag-person" : spot.value && isContent(spot.value) ? "tag-content" : "tag-project"
);
const subtitle = computed(() => {
    const n = related.value.length;
    if (!spot.value) return "";
    if (isPerson.value) return roleOf(spot.value, lang.value) ?? (n ? t.value.worksOnCount(n) : t.value.partOfTeam);
    return spot.value.group === NodeType.PROJECT ? t.value.projectBy(n) : t.value.peopleWorkOn(n);
});
</script>
<style scoped>
.attract {
    position: absolute;
    inset: 0;
    z-index: 20;
    pointer-events: none;
}

.spotlight {
    pointer-events: auto;
    position: absolute;
    left: var(--gap);
    bottom: var(--gap);
    width: min(30rem, 32vw);
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1.3rem 1.5rem 1.5rem;
    text-align: left;
}

.news {
    position: absolute;
    left: var(--gap);
    bottom: var(--gap);
    width: min(40rem, 42vw);
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1.3rem 1.5rem 1.5rem;
    pointer-events: auto;
}

.news-body {
    display: flex;
    gap: 1.4rem;
    align-items: flex-start;
}

.news-text {
    flex: 1;
    font-size: 1.15rem;
    line-height: 1.45;
    color: var(--text);
    display: -webkit-box;
    -webkit-line-clamp: 5;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.news-qr {
    flex: none;
    width: 7rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.8rem;
    text-align: center;
    color: var(--text-3);
}

.qr-code {
    width: 7rem;
    height: 7rem;
}

.spot-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.label {
    font-size: 0.9rem;
    color: var(--text-3);
}

.spot-main {
    display: flex;
    align-items: center;
    gap: 1.1rem;
}

.spot-photo {
    width: 4.8rem;
    height: 4.8rem;
}

.spot-text {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.35rem;
}

.bar {
    width: 2.2rem;
    height: 0.3rem;
    margin-bottom: 0.3rem;
    border-radius: 999px;
    background: var(--tone);
}

.spot-title {
    font-size: 1.6rem;
    font-weight: 600;
    line-height: 1.15;
    text-wrap: balance;
}

.spot-sub {
    color: var(--text-3);
}

.list {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    padding-top: 0.9rem;
    border-top: 1px solid var(--border);
}

.item {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    color: var(--text-2);
}

.item.more {
    color: var(--text-3);
    padding-left: 1.35rem;
}

.faces {
    display: flex;
    padding-top: 0.9rem;
    border-top: 1px solid var(--border);
}

.face {
    width: 2.6rem;
    height: 2.6rem;
    margin-right: -0.45rem;
    box-shadow: 0 0 0 2px var(--surface);
}

.cta {
    position: absolute;
    top: var(--gap);
    right: var(--gap);
    display: flex;
    align-items: center;
    gap: 1.4rem;
    padding: 1rem 2.2rem 1rem 1rem;
}

.touch {
    position: relative;
    width: 4.4rem;
    height: 4.4rem;
    display: grid;
    place-items: center;
}

.press {
    position: relative;
    display: grid;
    place-items: center;
    width: 4.4rem;
    height: 4.4rem;
    border-radius: 999px;
    background: #000;
    color: #fff;
    font-size: 1.3rem;
    animation: press 2.4s var(--ease-out) infinite;
}

.ring {
    position: absolute;
    inset: 0;
    border-radius: 999px;
    border: 2px solid #000;
    opacity: 0;
    animation: ripple 2.4s var(--ease-out) infinite;
}

.ring:nth-child(2) {
    animation-delay: 0.4s;
}

.cta-text {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.cta-title {
    font-size: 1.9rem;
    font-weight: 600;
    line-height: 1.1;
}

.cta-sub {
    font-size: 1.05rem;
    color: var(--text-3);
}

@keyframes ripple {
    0% {
        transform: scale(0.9);
        opacity: 0.5;
    }

    70%,
    100% {
        transform: scale(1.7);
        opacity: 0;
    }
}

@keyframes press {
    0%,
    100% {
        transform: scale(1);
    }

    8% {
        transform: scale(0.88);
    }

    22% {
        transform: scale(1);
    }
}

.spot-enter-active {
    transition: opacity 400ms ease, transform 500ms var(--ease-out);
}

.spot-leave-active {
    transition: opacity 250ms ease;
}

.spot-enter-from {
    opacity: 0;
    transform: translateY(1rem);
}

.spot-leave-to {
    opacity: 0;
}
</style>
