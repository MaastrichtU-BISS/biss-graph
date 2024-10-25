<template>
    <div class="">
        <div class="pt-4 mx-auto w-fit">
            <Dropdown v-model="selectedNode" :options="optionNodes" optionLabel="label" optionGroupLabel="label"
                optionGroupChildren="items" placeholder="Search" class="w-full md:w-80" showClear filter autoFilterFocus
                @change="updateGraph">
            </Dropdown>
        </div>
    </div>
    <div id="graph-container">
    </div>
    <template>
        <NodeInfoModal :nodeInfo="selectedNodeInfo" v-model:isVisible="modalIsVisible"></NodeInfoModal>
    </template>
</template>
<script setup lang="ts">
import cytoscape from 'cytoscape';
import cola from 'cytoscape-cola';
import cise from "cytoscape-cise";
import spread from "cytoscape-spread";
import coseBilkent from "cytoscape-cose-bilkent";
import euler from "cytoscape-euler";
import { ref, onMounted, computed } from 'vue';
import Dropdown from 'primevue/dropdown';
import NodeInfoModal from "./NodeInfoModal.vue";
import { type Cytoscape, NodeType, type Graph } from "../types/graph";

// cytoscape.use(cola);
// cytoscape.use(spread);
// cytoscape.use(cise);
// cytoscape.use(coseBilkent);
cytoscape.use(euler);

const selectedNode = ref();

const cy = ref();
let initialElements: Graph = { nodes: [], edges: [] };
let initialStyle: any[] = [];
let initialLayout: any = {};
const graph = ref<Cytoscape>({
    elements: {
        nodes: [],
        edges: []
    },
    style: [],
    layout: {}
});

const selectedNodeInfo = ref();
const modalIsVisible = ref<boolean>(false);

const initCytoscape = async (elements: Graph, style: any[], layout: any) => {
    graph.value = {
        elements: elements,
        style: style,
        layout: layout
    }

    cy.value = cytoscape({
        container: document.getElementById('graph-container'),
        elements: graph.value.elements,
        style: graph.value.style,
        layout: graph.value.layout
    });

    cy.value.nodes().on('click', (e: any) => {
        if(e.target.data().info_url?.length) {
            selectedNodeInfo.value = e.target.data();
            modalIsVisible.value = true;
        }
    });
};

//#region FILTER
const optionNodes = computed(() => {
    if (!cy.value?.nodes()) return [];

    const nodesGroups: { label: NodeType; items: { label: string; value: string }[] }[] = [{ label: NodeType.PROJECT, items: [] }, { label: NodeType.TEAM_MEMBER, items: [] }];

    cy.value.nodes((n: any) => {
        const group = n.data().group == NodeType.PROJECT;
        nodesGroups[group ? 0 : 1].items.push({ label: n.data().name, value: n.data().id });
    });

    return nodesGroups;
});

const updateGraph = async () => {
    if (!graph.value) return;
    cy.value.elements().show();

    if(selectedNode.value?.value) {
        const currentNode = cy.value.$id(selectedNode.value.value);
        currentNode.neighborhood().absoluteComplement().hide();
        currentNode.show();
    }
};
//#endregion

onMounted(async () => {
    initialElements = await (await fetch("/graph-elements.json")).json();
    initialStyle = await (await fetch("/graph-style.json")).json();
    initialLayout = await (await fetch("/graph-layout.json")).json();
    await initCytoscape(initialElements, initialStyle, initialLayout);
})
</script>
<style>
#graph-container {
    width: 100vw;
    height: calc(100vh - 54px);
    display: block;
}
</style>