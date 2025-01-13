<template>
    <div class="">
        <!-- <div class="pt-4 mx-auto w-fit">
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
        </div> -->
    </div>
    <div id="graph-container">
    </div>
    <template>
        <!-- <NodeInfoModal :nodeInfo="selectedNodeInfo" v-model:isVisible="modalIsVisible"></NodeInfoModal> -->
    </template>
</template>
<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import ForceGraph3D from '3d-force-graph';
import * as THREE from '//unpkg.com/three/build/three.module.js';
import { CSS2DRenderer, CSS2DObject } from '//unpkg.com/three/examples/jsm/renderers/CSS2DRenderer.js';
// import { UnrealBloomPass } from '//unpkg.com/three/examples/jsm/postprocessing/UnrealBloomPass.js';
import SpriteText from "https://esm.sh/three-spritetext";
// import Dropdown from 'primevue/dropdown';
// import NodeInfoModal from "./NodeInfoModal.vue";
import { NodeType } from "../types/graph";
import { Visitor, RandomVisitor } from "../utils/visitor";

const graph = ref();
const visitor = ref<Visitor>();
const traverseAnimation = ref<boolean>(true);
const lastInteractionTime = ref<number>(Date.now());
// const selectedNode = ref();
// const selectedNodeInfo = ref();
// const modalIsVisible = ref<boolean>(false);

const initialize = async () => {

    const graphContainer = document.getElementById('graph-container');

    if (!graphContainer) {
        throw new Error("element graph-container was not found");
    }

    const gData = await (await fetch("/public/graph-elements.json")).json();

    if (!gData) {
        throw new Error("graph-elements.json was not found");
    }

    graph.value = ForceGraph3D({  extraRenderers: [new CSS2DRenderer()] });
    graph.value(graphContainer)
        .graphData(gData)
        .showNavInfo(false)
        .nodeAutoColorBy("name")
        .linkDirectionalParticles(2)
        .linkDirectionalParticleSpeed(d => 2 * 0.001)
        // .linkAutoColorBy("target")
        // .backgroundColor('#000003')
        .nodeThreeObject(node => {
            if (node.group == NodeType.TEAM_MEMBER) {
                const imgTexture = new THREE.TextureLoader().load(`/src/assets/images/team/${node.id}.jpg`);
                imgTexture.colorSpace = THREE.SRGBColorSpace;
                const material = new THREE.SpriteMaterial({ map: imgTexture });
                const sprite = new THREE.Sprite(material);
                sprite.scale.set(12, 12);
                return sprite;
            } else {
                // const nodeEl = document.createElement('div');
                // nodeEl.textContent = node.name;
                // nodeEl.style.color = node.color;
                // nodeEl.className = 'node-label';
                // return new CSS2DObject(nodeEl);

                const sprite = new SpriteText(node.name);
                sprite.material.depthWrite = false; // make sprite background transparent
                sprite.color = node.color;
                sprite.textHeight = 4;
                return sprite;
            }
        })
        // .nodeThreeObjectExtend(node => {
        //     return node.group == NodeType.PROJECT;
        // })
        .onNodeClick(fitNodeIntoView);

    // const bloomPass = new UnrealBloomPass();
    // bloomPass.strength = 2;
    // bloomPass.radius = 1;
    // bloomPass.threshold = 0;
    // graph.value.postProcessingComposer().addPass(bloomPass);

    // Spread nodes a little wider
    graph.value.d3Force('charge').strength(-120);

};

const fitNodeIntoView = (node: any) => {
    // Aim at node from outside it
    const distance = 40;
    const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);

    const newPos = node.x || node.y || node.z
        ? { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }
        : { x: 0, y: 0, z: distance }; // special case if node is in (0,0,0)

    graph.value.cameraPosition(
        newPos, // new position
        node, // lookAt ({ x, y, z })
        3000  // ms transition duration
    )
};

//#region Visitor

const initializeVisitor = (time: number = 6000) => {
    visitor.value = new RandomVisitor(graph.value.graphData());
    setInterval(() => {
        if (traverseAnimation.value) {
            visitor.value?.moveNext();
            const currentNodeId = visitor.value?.getCurrentNodeId();
            const currentNode = graph.value.graphData().nodes.find((n: any) => n.id == currentNodeId);
            fitNodeIntoView(currentNode);
        } else {
            tryResumeTraverseAnimation();
        }
    }, time);
};

// this has to be called inside of a setInterval. Every x seconds
const tryResumeTraverseAnimation = () => {
    // 5 minutes have passed since the last user interaction
    if ((((Date.now() - lastInteractionTime.value)) / 1000) > 3000) {
        traverseAnimation.value = true;
    }
};

// this has to be called whenever the user interacts with the screen
const stopTraverseAnimation = () => {
    lastInteractionTime.value = Date.now();
    traverseAnimation.value = false;
};

//#endregion

onMounted(async () => {
    await initialize();
    initializeVisitor();
    document.body.addEventListener('touchstart', stopTraverseAnimation);
    document.body.addEventListener('click', stopTraverseAnimation);
})
</script>
<style scoped></style>