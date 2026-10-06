<template>
    <div class="backdrop" @click.self="emit('close')">
        <section class="sheet surface" role="dialog" :aria-label="title">
            <header class="head">
                <div class="heading">
                    <span class="source">biss-institute.com</span>
                    <h2>{{ title }}</h2>
                </div>
                <button class="btn btn-secondary" @click="emit('close')">
                    <Icon name="close" />
                    Close
                </button>
            </header>
            <div class="frame">
                <div v-if="!loaded" class="loading" aria-hidden="true">
                    <span class="spinner"></span>
                </div>
                <iframe :src="url" :title="title" :class="{ ready: loaded }" @load="loaded = true"></iframe>
            </div>
        </section>
    </div>
</template>
<script setup lang="ts">
import { ref, watch } from "vue";
import Icon from "./Icon.vue";

const props = defineProps<{ url: string; title: string }>();
const emit = defineEmits<{ close: [] }>();

const loaded = ref(false);
watch(() => props.url, () => (loaded.value = false));
</script>
<style scoped>
.backdrop {
    position: absolute;
    inset: 0;
    z-index: 50;
    display: grid;
    place-items: center;
    padding: var(--gap);
    background: rgba(0, 0, 0, 0.6);
}

.sheet {
    width: min(100%, 90rem);
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 2rem;
    padding: 1rem 1.2rem 1rem 1.8rem;
    border-bottom: 1px solid var(--border);
}

.heading {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    min-width: 0;
}

.source {
    font-size: 0.9rem;
    color: var(--text-3);
}

h2 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.frame {
    position: relative;
    flex: 1;
}

iframe {
    width: 100%;
    height: 100%;
    border: 0;
    opacity: 0;
    transition: opacity 250ms ease;
    touch-action: pan-y;
}

iframe.ready {
    opacity: 1;
}

.loading {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
}

.spinner {
    width: 2.6rem;
    height: 2.6rem;
    border-radius: 999px;
    border: 3px solid var(--border);
    border-top-color: var(--text);
    animation: spin 800ms linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(1turn);
    }
}
</style>
