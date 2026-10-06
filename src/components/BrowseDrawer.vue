<template>
    <div class="backdrop" @click.self="emit('close')">
        <section class="sheet night" role="dialog" :aria-label="t.allProjects">
            <header class="head">
                <div class="tabs" role="tablist">
                    <button v-for="tb in tabs" :key="tb.key" role="tab" class="tab" :aria-selected="tab === tb.key"
                        @click="tab = tb.key">
                        {{ tb.label }}
                        <span class="count">{{ tb.count }}</span>
                    </button>
                </div>
                <button class="icon-button" :aria-label="t.close" @click="emit('close')">
                    <Icon name="close" />
                </button>
            </header>

            <Transition name="fade" mode="out-in">
                <ul v-if="tab === 'people'" key="people" class="grid people scroll">
                    <li v-for="p in people" :key="p.id">
                        <button class="card person" @click="emit('select', p.id)">
                            <img :src="p.photo" :alt="p.title" class="avatar photo" />
                            <span class="name">{{ p.title }}</span>
                            <span class="meta">{{ roleOf(p, lang) ?? t.projectCount(projectsOf(p).length) }}</span>
                        </button>
                    </li>
                </ul>
                <ul v-else :key="tab" class="grid projects scroll">
                    <li v-for="p in tab === 'projects' ? projects : publications" :key="p.id">
                        <button class="card project" :style="{ '--tone': p.color }" @click="emit('select', p.id)">
                            <span class="bar" aria-hidden="true"></span>
                            <span class="name">{{ titleOf(p, lang) }}</span>
                            <span class="footer">
                                <span class="faces">
                                    <img v-for="m in p.connections.slice(0, 5)" :key="m" :src="entities[m].photo"
                                        alt="" class="avatar face" />
                                    <span v-if="p.connections.length > 5" class="meta">+{{ p.connections.length - 5
                                        }}</span>
                                </span>
                                <span v-if="p.status" class="tag"
                                    :class="p.status === 'finished' ? 'tag-finished' : 'tag-running'">
                                    {{ p.status === "finished" ? t.finished : t.running }}
                                </span>
                                <span v-else-if="tab === 'publications'" class="tag tag-content">
                                    {{ p.group === NodeType.EDUCATION ? t.education : t.publication }}
                                </span>
                            </span>
                        </button>
                    </li>
                </ul>
            </Transition>
        </section>
    </div>
</template>
<script setup lang="ts">
import { computed } from "vue";
import Icon from "./Icon.vue";
import { entities, people, projects, projectsOf, publications, roleOf, titleOf } from "../data/graph";
import { NodeType, type BrowseTab } from "../types/graph";
import { lang, t } from "../i18n";

const tab = defineModel<BrowseTab>("tab", { required: true });
const emit = defineEmits<{ select: [id: string]; close: [] }>();

const tabs = computed(() => [
    { key: "people" as const, label: t.value.people, count: people.length },
    { key: "projects" as const, label: t.value.projects, count: projects.length },
    ...(publications.length
        ? [{ key: "publications" as const, label: t.value.publications, count: publications.length }]
        : []),
]);
</script>
<style scoped>
.backdrop {
    position: absolute;
    inset: 0;
    z-index: 40;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding: var(--gap);
    background: rgba(0, 0, 0, 0.5);
}

.sheet {
    width: min(100%, 110rem);
    height: min(68vh, 60rem);
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.8rem 1.2rem 0 1.8rem;
    border-bottom: 1px solid var(--border);
}

.tabs {
    display: flex;
    gap: 2rem;
    align-self: stretch;
}

.tab {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 3.6rem;
    font-weight: 500;
    font-size: 1.2rem;
    color: var(--text-3);
    border-bottom: 3px solid transparent;
    margin-bottom: -1px;
    transition: color 160ms ease, border-color 160ms ease;
}

.tab[aria-selected="true"] {
    color: var(--text);
    border-bottom-color: var(--text);
}

.count {
    font-size: 0.9rem;
    color: var(--text-3);
}

.grid {
    flex: 1;
    list-style: none;
    margin: 0;
    padding: 1.4rem 1.8rem 2rem;
    display: grid;
    gap: 1rem;
    align-content: start;
}

.people {
    grid-template-columns: repeat(auto-fill, minmax(10.5rem, 1fr));
    grid-auto-rows: 1fr;
}

.projects {
    grid-template-columns: repeat(auto-fill, minmax(19rem, 1fr));
}

.card {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    border-radius: var(--radius);
    border: 1px solid var(--border);
    transition: transform 140ms var(--ease-out), background-color 140ms ease;
}

.card:active {
    transform: scale(0.97);
    background: var(--surface-2);
}

.person {
    align-items: center;
    text-align: center;
    gap: 0.4rem;
    padding: 1.3rem 0.8rem 1.1rem;
}

.photo {
    width: 6rem;
    height: 6rem;
    margin-bottom: 0.5rem;
}

.name {
    font-weight: 500;
    font-size: 1.05rem;
    line-height: 1.3;
    text-wrap: balance;
}

.meta {
    font-size: 0.85rem;
    color: var(--text-3);
}

.project {
    align-items: flex-start;
    text-align: left;
    gap: 0.8rem;
    padding: 1.2rem 1.3rem;
}

.bar {
    width: 2.2rem;
    height: 0.3rem;
    border-radius: 999px;
    background: var(--tone);
}

.footer {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: auto;
    padding-top: 0.4rem;
}

.faces {
    display: flex;
    align-items: center;
}

.face {
    width: 2rem;
    height: 2rem;
    margin-right: -0.4rem;
    box-shadow: 0 0 0 2px var(--surface);
}

.faces .meta {
    margin-left: 0.8rem;
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 160ms ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
