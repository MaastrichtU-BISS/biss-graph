<template>
    <div class="player" :class="{ light: theme === 'light' }">
        <component :is="showcase.component" :members="members" @done="emit('done')" />
        <div class="hint">
            <Icon name="tap" /> {{ t.touchToExploreShort }}
        </div>
        <div class="progress" :style="{ animationDuration: `${showcase.duration}s` }"></div>
    </div>
</template>
<script setup lang="ts">
import Icon from "./Icon.vue";
import { t, theme } from "../i18n";
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

.player.light {
    background: #f6f7fb;
}

.player.light .hint {
    color: #0b1020;
    background: rgba(255, 255, 255, 0.88);
    border-color: rgba(11, 16, 32, 0.14);
}

.player.light .progress {
    background: #0b1020;
}

.hint {
    position: absolute;
    top: var(--gap);
    right: var(--gap);
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.7rem 1.3rem;
    border-radius: 999px;
    background: rgba(12, 17, 38, 0.72);
    border: 1px solid rgba(255, 255, 255, 0.12);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    color: #fff;
    font-size: 1.05rem;
    font-weight: 500;
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

@media (max-width: 700px) {
    .hint {
        top: calc(env(safe-area-inset-top) + 0.65rem);
        right: 0.75rem;
        padding: 0.55rem 0.75rem;
        font-size: 0.8rem;
    }
}
</style>
