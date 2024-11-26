<template>
    <div class="">
        <div class="pt-4 mx-auto w-fit">
            <Dropdown v-model="selectedNode" :options="optionNodes" optionLabel="label" optionGroupLabel="label"
                optionGroupChildren="items" placeholder="Search" class="w-full md:w-80" showClear filter autoFilterFocus
                @change="updateGraph">
                <template #value="slotProps">
                    <div v-if="slotProps.value" class="flex align-items-center">
                        <i v-if="slotProps.value.group == NodeType.PROJECT" class="pi pi-circle-fill mr-2 content-center" :style="`color: ${slotProps.value.color}`"></i>
                        <div>{{ slotProps.value.value }}</div>
                    </div>
                    <span v-else>
                        {{ slotProps.placeholder }}
                    </span>
                </template>
                <template #option="slotProps">
                    <div class="flex align-items-center">
                        <i v-if="slotProps.option.group == NodeType.PROJECT" class="pi pi-circle-fill mr-2 content-center" :style="`color: ${slotProps.option.color}`"></i>
                        <div>{{ slotProps.option.label }}</div>
                    </div>
                </template>
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
import cise from "cytoscape-cise";
import panzoom from "cytoscape-panzoom";
import { ref, onMounted, computed } from 'vue';
import Dropdown from 'primevue/dropdown';
import NodeInfoModal from "./NodeInfoModal.vue";
import { type Cytoscape, NodeType, type Graph } from "../types/graph";
import "../../node_modules/cytoscape-panzoom/cytoscape.js-panzoom.css";

cytoscape.use(cise);
cytoscape.use(panzoom);

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

    const initialCy = cytoscape({
        container: document.getElementById('graph-container'),
        elements: elements
    });

    const clustersSet = new Map<string, number>();
    const clusters = initialCy.elements().markovClustering();

    clusters.forEach((cluster: any, index: number) => {
        cluster.forEach((node: any) => {
            clustersSet.set(node.id(), index);
        });
    });

    graph.value = {
        elements: elements,
        style: style,
        layout: {
            ...layout,
            clusters: function (node: any) {
                return clustersSet.get(node.id())
            }
        }
    }

    cy.value = cytoscape({
        container: document.getElementById('graph-container'),
        elements: graph.value.elements,
        style: graph.value.style,
        layout: graph.value.layout
    });

    cy.value.panzoom({
        zoomFactor: 0.05, // zoom factor per zoom tick
        zoomDelay: 45, // how many ms between zoom ticks
        minZoom: 0.10, // min zoom level
        maxZoom: 4, // max zoom level
        fitPadding: 10, // padding when fitting
        panSpeed: 10, // how many ms in between pan ticks
        panDistance: 10, // max pan distance per tick
        panDragAreaSize: 75, // the length of the pan drag box in which the vector for panning is calculated (bigger = finer control of pan speed and direction)
        panMinPercentSpeed: 0.25, // the slowest speed we can pan by (as a percent of panSpeed)
        panInactiveArea: 8, // radius of inactive area in pan drag box
        panIndicatorMinOpacity: 0.5, // min opacity of pan indicator (the draggable nib); scales from this to 1.0
        zoomOnly: false, // a minimal version of the ui only with zooming (useful on systems with bad mousewheel resolution)
        fitSelector: undefined, // selector of elements to fit
        animateOnFit: function () { // whether to animate on fit
            return true;
        },
        fitAnimationDuration: 500, // duration of animation on fit

        // icon class names
        sliderHandleIcon: 'fa fa-minus',
        zoomInIcon: 'fa fa-plus',
        zoomOutIcon: 'fa fa-minus',
        resetIcon: 'fa fa-expand'
    });

    cy.value.animate({
        fit: { padding: 10 }
    });

    cy.value.nodes().on('click', (e: any) => {

        cy.value.elements().removeClass("highlight-node");
        cy.value.elements().removeClass("highlight-edge");

        if (e.target.data().info_url?.length) {
            selectedNodeInfo.value = e.target.data();
            modalIsVisible.value = true;
        }

        const currentNode = cy.value.$id(e.target.id());

        currentNode.addClass("highlight-node");
        currentNode.neighborhood().addClass('highlight-node');
        currentNode.connectedEdges().addClass("highlight-edge");
    });
};

//#region FILTER
const optionNodes = computed(() => {
    if (!cy.value?.nodes()) return [];

    const nodesGroups: { label: NodeType; items: { label: string; value: string; color: string; group: NodeType }[] }[] = [{ label: NodeType.PROJECT, items: [] }, { label: NodeType.TEAM_MEMBER, items: [] }];

    cy.value.nodes((n: any) => {
        const group = n.data().group == NodeType.PROJECT;
        nodesGroups[group ? 0 : 1].items.push({ label: n.data().name, value: n.data().id, color: n.data().color, group: n.data().group });
    });

    return nodesGroups;
});

const updateGraph = async () => {
    if (!graph.value) return;
    cy.value.elements().show();

    if (selectedNode.value?.value) {
        const currentNode = cy.value.$id(selectedNode.value.value);
        currentNode.neighborhood().absoluteComplement().hide();
        currentNode.show();
    }

    cy.value.animate({
        duration: 500,
        fit: { padding: 10 }
    });
};
//#endregion

onMounted(async () => {
    initialElements = await (await fetch("/graph-elements.json")).json();
    initialStyle = await (await fetch("/graph-style.json")).json();
    initialLayout = await (await fetch("/graph-layout.json")).json();
    await initCytoscape(initialElements, initialStyle, initialLayout);
})
</script>
<style scoped>
#graph-container {
    width: 100vw;
    height: calc(100vh - 54px);
    display: block;
}

.highlight {
    background-color: aqua !important;
}
</style>