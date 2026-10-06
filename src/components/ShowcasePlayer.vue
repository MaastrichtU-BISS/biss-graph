<template>
    <div class="player">
        <component :is="showcase.component" :members="members" @done="emit('done')" />
        <div class="hint">
            <Icon name="tap" /> {{ t.touchToExploreShort }}
        </div>
        <div class="progress" :style="{ animationDuration: `${showcase.duration}s` }"></div>
    </div>
</template>
<script setup lang="ts">
import Icon from "./Icon.vue";
import { t } from "../i18n";
import { provide } from "vue";
import type { Showcase } from "../showcases";

const props = defineProps<{ showcase: Showcase; members: { photo?: string; title: string }[] }>();
// lets the shared stage look up this showcase's translated captions
provide("showcaseId", props.showcase.id);
const emit = defineEmits<{ done: [] }>();
</script>
<style scoped>
.player {
    position: absolute;
    inset: 0;
    z-index: 60;
    overflow: hidden;
    background:
        radial-gradient(ellipse 70% 60% at 50% 40%, #101a3d 0%, transparent 70%),
        #060914;
}

.hint {
    position: absolute;
    top: var(--gap);
    right: var(--gap);
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.8rem 1.4rem;
    border-radius: 999px;
    background: #fff;
    color: #000;
    font-size: 1.1rem;
    font-weight: 600;
    animation: hint-pulse 2.4s var(--ease-out) infinite;
}

/* a gentle breathing glow, so passers-by notice they can take over */
@keyframes hint-pulse {
    0%,
    100% {
        transform: scale(1);
        box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.55);
    }

    12% {
        transform: scale(0.95);
    }

    30% {
        transform: scale(1);
    }

    70% {
        box-shadow: 0 0 0 1.2rem rgba(255, 255, 255, 0);
    }
}

.progress {
    position: absolute;
    left: 0;
    bottom: 0;
    height: 4px;
    width: 100%;
    background: rgba(255, 255, 255, 0.6);
    transform-origin: left;
    animation: progress linear forwards;
}

@keyframes progress {
    from {
        transform: scaleX(0);
    }

    to {
        transform: scaleX(1);
    }
}
</style>
