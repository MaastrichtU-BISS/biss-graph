<template>
    <aside class="panel night" :style="{ '--tone': entity.color }">
        <div class="toolbar">
            <button v-if="canGoBack" class="icon-button" :aria-label="t.close" @click="emit('back')">
                <Icon name="back" />
            </button>
            <span class="tag" :class="tagClass">{{ kindLabel }}</span>
            <span v-if="entity.status" class="tag" :class="entity.status === 'finished' ? 'tag-finished' : 'tag-running'">
                {{ entity.status === "finished" ? t.finished : t.running }}
            </span>
            <button class="icon-button ml-auto" :aria-label="t.close" @click="emit('close')">
                <Icon name="close" />
            </button>
        </div>

        <Transition name="swap" mode="out-in">
            <div :key="entity.id + lang" class="body scroll">
                <header class="hero" :class="{ person: isPerson }">
                    <img v-if="isPerson" :src="entity.photo" :alt="entity.title" class="avatar hero-photo" />
                    <span v-else class="hero-bar" aria-hidden="true"></span>
                    <h2 class="title">{{ titleOf(entity, lang) }}</h2>
                    <p v-if="roleOf(entity, lang)" class="role">{{ roleOf(entity, lang) }}</p>
                    <p class="summary">{{ summary }}</p>
                    <div v-if="entity.areas.length" class="area-tags">
                        <span v-for="a in entity.areas" :key="a" class="area">{{ t.area[a] ?? a }}</span>
                    </div>
                    <div class="actions">
                        <button v-for="s in showcases" :key="s.id" class="btn btn-primary" @click="emit('play', s.id)">
                            <Icon name="play" />
                            {{ showcases.length > 1 ? t.watch(s.title) : t.watchAnimation }}
                        </button>
                        <button v-if="entity.infoUrl" class="btn"
                            :class="showcases.length ? 'btn-secondary' : 'btn-primary'"
                            @click="emit('open', entity.infoUrl)">
                            {{ isPerson ? t.viewProfile : isProject ? t.readProject : t.readMore }}
                            <Icon name="open" />
                        </button>
                    </div>
                </header>

                <section v-if="isPerson && projectsList.length">
                    <h3 class="section-title">{{ t.worksOn }}</h3>
                    <ul class="projects">
                        <li v-for="p in projectsList" :key="p.id">
                            <button class="row" :style="{ '--tone': p.color }" @click="emit('select', p.id)">
                                <span class="dot" aria-hidden="true"></span>
                                <span class="row-text">
                                    <span class="row-title">{{ titleOf(p, lang) }}</span>
                                    <span class="faces">
                                        <img v-for="m in teammates(p)" :key="m.id" :src="m.photo" alt=""
                                            class="avatar face" />
                                        <span v-if="p.connections.length > 6" class="more">
                                            +{{ p.connections.length - 6 }}
                                        </span>
                                    </span>
                                </span>
                                <Icon name="chevron" class="chevron" />
                            </button>
                        </li>
                    </ul>
                </section>

                <section v-if="isPerson && contentList.length">
                    <h3 class="section-title">{{ t.alsoInvolved }}</h3>
                    <ul class="projects">
                        <li v-for="p in contentList" :key="p.id">
                            <button class="row compact" :style="{ '--tone': p.color }" @click="emit('select', p.id)">
                                <span class="doc" aria-hidden="true"></span>
                                <span class="row-text">
                                    <span class="row-title">{{ titleOf(p, lang) }}</span>
                                    <span class="row-kind">{{ p.group === NodeType.EDUCATION ? t.education : t.publication }}</span>
                                </span>
                                <Icon name="chevron" class="chevron" />
                            </button>
                        </li>
                    </ul>
                </section>

                <section v-if="!isPerson">
                    <h3 class="section-title">{{ isProject ? t.theTeam : t.authors }}</h3>
                    <ul class="team">
                        <li v-for="m in related" :key="m.id">
                            <button class="member" @click="emit('select', m.id)">
                                <img :src="m.photo" :alt="m.title" class="avatar member-photo" />
                                <span class="member-name">{{ m.title }}</span>
                            </button>
                        </li>
                    </ul>
                </section>

                <section v-if="takeAway" class="take-away">
                    <QrCode :url="takeAway" class="take-qr" />
                    <div>
                        <h3 class="section-title">{{ t.takeItWithYou }}</h3>
                        <p class="summary">{{ t.scanToOpen }}</p>
                    </div>
                </section>
            </div>
        </Transition>
    </aside>
</template>
<script setup lang="ts">
import { computed } from "vue";
import Icon from "./Icon.vue";
import QrCode from "./QrCode.vue";
import { contentOf, entities, isContent, projectsOf, roleOf, titleOf, websiteUrlOf } from "../data/graph";
import { Entity, NodeType } from "../types/graph";
import { lang, t } from "../i18n";

const props = withDefaults(
    defineProps<{ id: string; canGoBack: boolean; showcases?: { id: string; title: string }[] }>(),
    { showcases: () => [] }
);
const emit = defineEmits<{
    select: [id: string];
    back: [];
    close: [];
    open: [url: string];
    play: [showcase: string];
}>();

const entity = computed(() => entities[props.id]);
const isPerson = computed(() => entity.value.group === NodeType.TEAM_MEMBER);
const isProject = computed(() => entity.value.group === NodeType.PROJECT);
const related = computed(() => entity.value.connections.map((id) => entities[id]));
const projectsList = computed(() => projectsOf(entity.value));
const contentList = computed(() => contentOf(entity.value));

const kindLabel = computed(() =>
    isPerson.value
        ? t.value.teamMember
        : isProject.value
          ? t.value.project
          : entity.value.group === NodeType.EDUCATION
            ? t.value.education
            : t.value.publication
);
const tagClass = computed(() => (isPerson.value ? "tag-person" : isContent(entity.value) ? "tag-content" : "tag-project"));

const summary = computed(() => {
    if (isPerson.value) {
        const n = projectsList.value.length;
        return n ? t.value.involvedIn(n) : t.value.partOfTeam;
    }
    return isProject.value ? t.value.peopleWorkOn(related.value.length) : t.value.byAuthors(related.value.length);
});

/** What the QR code opens: the publication itself if there is one, else the page on the website. */
const takeAway = computed(() => {
    const url = entity.value.links[0]?.url ?? entity.value.pageUrl;
    return url ? websiteUrlOf(url, lang.value) : undefined;
});

const teammates = (project: Entity) => project.connections.slice(0, 6).map((id) => entities[id]);
</script>
<style scoped>
.panel {
    /* a soft glow in the colour of what's selected, so each panel feels like part of the graph */
    background-image: radial-gradient(ellipse 120% 40% at 50% 0%, color-mix(in srgb, var(--tone) 22%, transparent), transparent 70%);
    position: absolute;
    top: var(--gap);
    right: var(--gap);
    bottom: var(--gap);
    width: var(--panel-width);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    z-index: 30;
}

.toolbar {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.2rem 1.2rem 0;
}

.body {
    flex: 1;
    padding: 0.5rem 1.8rem 2.2rem;
}

.hero {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.9rem;
    padding: 1.2rem 0 1.8rem;
    border-bottom: 1px solid var(--border);
}

.hero.person {
    align-items: center;
    text-align: center;
}

.hero-photo {
    width: 10rem;
    height: 10rem;
}

.hero-bar {
    width: 3rem;
    height: 0.35rem;
    border-radius: 999px;
    background: var(--tone);
}

.title {
    margin: 0;
    font-size: 2.1rem;
    line-height: 1.15;
    font-weight: 600;
    text-wrap: balance;
}

.role {
    margin: -0.3rem 0 0;
    font-size: 1.15rem;
    color: var(--text-2);
}

.area-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
}

.hero.person .area-tags {
    justify-content: center;
}

.area {
    padding: 0.15rem 0.65rem;
    border-radius: 999px;
    font-size: 0.85rem;
    color: var(--text-2);
    border: 1px solid var(--border-strong);
}

.row.compact {
    padding: 0.8rem 1rem;
}

.doc {
    width: 1rem;
    height: 1.3rem;
    flex: none;
    border-radius: 0.2rem;
    border: 2px solid var(--tone);
    border-top-width: 0.35rem;
}

.row-kind {
    font-size: 0.85rem;
    color: var(--text-3);
}

.take-away {
    display: flex;
    align-items: center;
    gap: 1.2rem;
    margin-top: 2rem;
    padding: 1.2rem;
    border-radius: var(--radius);
    background: var(--surface-2);
}

.take-away .section-title {
    margin: 0 0 0.3rem;
}

.take-away .summary {
    margin: 0;
}

.take-qr {
    width: 6.5rem;
    height: 6.5rem;
    flex: none;
    padding: 0.4rem;
    background: #fff;
    border-radius: 0.3rem;
}

.actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
}

.hero.person .actions {
    justify-content: center;
}

.summary {
    margin: 0 0 0.4rem;
    color: var(--text-3);
    font-size: 1.05rem;
}

.section-title {
    margin: 1.8rem 0 1rem;
    font-size: 1.15rem;
    font-weight: 600;
}

ul {
    list-style: none;
    margin: 0;
    padding: 0;
}

.projects {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
}

.row {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1.1rem;
    text-align: left;
    border-radius: var(--radius);
    border: 1px solid var(--border);
    transition: transform 140ms var(--ease-out), background-color 140ms ease;
}

.row:active {
    transform: scale(0.985);
    background: var(--surface-2);
}

.row-text {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
}

.row-title {
    font-weight: 500;
    font-size: 1.1rem;
    line-height: 1.3;
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

.more {
    margin-left: 0.8rem;
    font-size: 0.85rem;
    color: var(--text-3);
}

.chevron {
    color: var(--text-3);
}

.team {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(8.5rem, 1fr));
    /* every card as tall as the tallest, also across rows */
    grid-auto-rows: 1fr;
    gap: 0.6rem;
}

.member {
    width: 100%;
    height: 100%;
    justify-content: flex-start;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.7rem;
    padding: 1.1rem 0.6rem;
    border-radius: var(--radius);
    border: 1px solid var(--border);
    transition: transform 140ms var(--ease-out), background-color 140ms ease;
}

.member:active {
    transform: scale(0.97);
    background: var(--surface-2);
}

.member-photo {
    width: 5rem;
    height: 5rem;
}

.member-name {
    font-size: 0.95rem;
    font-weight: 500;
    line-height: 1.25;
    text-align: center;
    text-wrap: balance;
}

.swap-enter-active,
.swap-leave-active {
    transition: opacity 200ms ease, transform 280ms var(--ease-out);
}

.swap-enter-from {
    opacity: 0;
    transform: translateY(0.75rem);
}

.swap-leave-to {
    opacity: 0;
}

@media (max-width: 700px) {
    .panel {
        inset: 0;
        width: 100%;
        border-radius: 0;
    }
    .toolbar { padding: calc(env(safe-area-inset-top) + 0.7rem) 1rem 0; }
    .body { padding: 0.4rem 1rem calc(env(safe-area-inset-bottom) + 1.5rem); }
    .hero { gap: 0.65rem; padding-top: 0.8rem; }
    .hero-photo { width: 7rem; height: 7rem; }
    .title { font-size: 1.65rem; }
    .actions { width: 100%; }
    .actions .btn { flex: 1 1 100%; }
    .take-away { gap: 0.75rem; padding: 0.8rem; }
    .take-qr { width: 5rem; height: 5rem; }
    .team { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
