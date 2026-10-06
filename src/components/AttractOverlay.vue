<template>
    <div class="attract">
        <Transition name="spot" mode="out-in">
            <button v-if="spot" :key="spot.id" class="spotlight surface" @click="emit('select', spot.id)">
                <span class="spot-head">
                    <span class="label">In the spotlight</span>
                    <span class="tag" :class="isPerson ? 'tag-person' : 'tag-project'">
                        {{ isPerson ? "Team member" : "Project" }}
                    </span>
                </span>
                <span class="spot-main">
                    <img v-if="isPerson" :src="spot.photo" alt="" class="avatar spot-photo" />
                    <span class="spot-text">
                        <span v-if="!isPerson" class="bar" :style="{ '--tone': spot.color }"
                            aria-hidden="true"></span>
                        <span class="spot-title">{{ spot.title }}</span>
                        <span class="spot-sub">{{ subtitle }}</span>
                    </span>
                </span>
                <span v-if="isPerson" class="list">
                    <span v-for="p in related.slice(0, 3)" :key="p.id" class="item" :style="{ '--tone': p.color }">
                        <span class="dot" aria-hidden="true"></span>
                        {{ p.title }}
                    </span>
                    <span v-if="related.length > 3" class="item more">+{{ related.length - 3 }} more</span>
                </span>
                <span v-else class="faces">
                    <img v-for="m in related.slice(0, 7)" :key="m.id" :src="m.photo" alt="" class="avatar face" />
                </span>
            </button>
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
                <span class="cta-title">Touch the screen to explore</span>
                <span class="cta-sub">Find out who at BISS works on which project</span>
            </span>
        </div>
    </div>
</template>
<script setup lang="ts">
import { computed } from "vue";
import Icon from "./Icon.vue";
import { entities } from "../data/graph";
import { NodeType } from "../types/graph";

const props = defineProps<{ spotlightId: string | null }>();
const emit = defineEmits<{ select: [id: string] }>();

const spot = computed(() => (props.spotlightId ? entities[props.spotlightId] : null));
const isPerson = computed(() => spot.value?.group === NodeType.TEAM_MEMBER);
const related = computed(() => spot.value?.connections.map((id) => entities[id]) ?? []);
const subtitle = computed(() => {
    const n = related.value.length;
    return isPerson.value
        ? spot.value?.role ?? `Works on ${n} ${n === 1 ? "project" : "projects"}`
        : `A project by ${n} ${n === 1 ? "person" : "people"}`;
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
