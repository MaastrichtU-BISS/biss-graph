<template>
    <section class="filter-panel surface" role="dialog" :aria-label="t.filter">
        <div class="group">
            <h3>{{ t.status }}</h3>
            <div class="chips">
                <button v-for="s in statuses" :key="s.key" class="chip" :aria-pressed="model.status === s.key"
                    @click="model.status = s.key">
                    {{ s.label }}
                </button>
            </div>
        </div>
        <div class="group">
            <h3>{{ t.areas }}</h3>
            <div class="chips">
                <button v-for="a in areas" :key="a" class="chip" :aria-pressed="model.areas.includes(a)"
                    @click="toggleArea(a)">
                    {{ t.area[a] ?? a }}
                </button>
            </div>
        </div>
        <div v-if="publications.length" class="group">
            <h3>{{ t.show }}</h3>
            <div class="chips">
                <button class="chip" :aria-pressed="model.publications" @click="model.publications = !model.publications">
                    {{ t.publications }}
                </button>
            </div>
        </div>
        <button class="icon-button close" :aria-label="t.close" @click="emit('close')">
            <Icon name="close" />
        </button>
    </section>
</template>
<script lang="ts">
import { entities, isContent, people, projects, publications } from "../data/graph";

export type Filters = { status: "all" | "in-progress" | "finished"; areas: string[]; publications: boolean };

export const emptyFilters = (): Filters => ({ status: "all", areas: [], publications: true });

/**
 * The nodes a filter keeps: matching projects, the people working on them and, if shown,
 * their publications. `null` when nothing is filtered.
 */
export function filterMatches(f: Filters): Set<string> | null {
    const byProject = f.status !== "all" || f.areas.length > 0;
    if (!byProject && f.publications) return null;
    const keep = new Set<string>();
    const kept = projects.filter(
        (p) =>
            (f.status === "all" || p.status === f.status) &&
            (!f.areas.length || p.areas.some((a) => f.areas.includes(a)))
    );
    kept.forEach((p) => {
        keep.add(p.id);
        p.connections.forEach((id) => keep.add(id));
    });
    if (!byProject) people.forEach((p) => keep.add(p.id));
    if (f.publications) {
        publications
            .filter((c) => !byProject || c.connections.some((id) => keep.has(id)))
            .forEach((c) => keep.add(c.id));
    }
    // people only linked to filtered-out things fade too
    if (!byProject) projects.forEach((p) => keep.add(p.id));
    for (const id of [...keep]) if (isContent(entities[id]) && !f.publications) keep.delete(id);
    return keep;
}
</script>
<script setup lang="ts">
import Icon from "./Icon.vue";
import { areas } from "../data/graph";
import { computed } from "vue";
import { t } from "../i18n";

const model = defineModel<Filters>({ required: true });
const emit = defineEmits<{ close: [] }>();

const statuses = computed(() => [
    { key: "all" as const, label: t.value.all },
    { key: "in-progress" as const, label: t.value.running },
    { key: "finished" as const, label: t.value.finished },
]);

const toggleArea = (a: string) => {
    model.value.areas = model.value.areas.includes(a) ? model.value.areas.filter((x) => x !== a) : [...model.value.areas, a];
};
</script>
<style scoped>
.filter-panel {
    position: absolute;
    width: min(34rem, calc(100vw - 2 * var(--gap)));
    display: flex;
    flex-direction: column;
    gap: 1.1rem;
    padding: 1.4rem 1.4rem 1.5rem;
}

.close {
    position: absolute;
    top: 0.8rem;
    right: 0.8rem;
}

h3 {
    margin: 0 0 0.6rem;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-2);
}

.chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.chip {
    min-height: 3rem;
    padding: 0 1.1rem;
    border-radius: 999px;
    border: 1px solid var(--border-strong);
    font-size: 1rem;
    font-weight: 500;
    transition: background-color 140ms ease, color 140ms ease, transform 140ms var(--ease-out);
}

.chip:active {
    transform: scale(0.96);
}

.chip[aria-pressed="true"] {
    background: #000;
    border-color: #000;
    color: #fff;
}
</style>
