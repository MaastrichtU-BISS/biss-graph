<template>
    <div class="absolute bottom-0 pb-2 w-full z-10">
        <table class="w-full table-fixed align-middle">
            <td>
                <div class="w-fit z-10">
                    <Dropdown v-model="selectedNode" :options="optionNodes" optionLabel="label" optionGroupLabel="label"
                        optionGroupChildren="items" placeholder="Search" class="w-full md:w-80" showClear filter
                        autoFilterFocus @change="fitNodeIntoView($event.value?.value)">
                        <template #value="slotProps">
                            <div v-if="slotProps.value" class="flex align-items-center">
                                <i v-if="slotProps.value.group == NodeType.PROJECT"
                                    class="pi pi-circle-fill mr-2 content-center"
                                    :style="`color: ${slotProps.value.color}`"></i>
                                <div>{{ slotProps.value.label }}</div>
                            </div>
                            <span v-else>
                                <i class="pi pi-search px-2"></i>
                                {{ slotProps.placeholder }}
                            </span>
                        </template>
                        <template #option="slotProps">
                            <div class="flex align-items-center">
                                <i v-if="slotProps.option.group == NodeType.PROJECT"
                                    class="pi pi-circle-fill mr-2 content-center"
                                    :style="`color: ${slotProps.option.color}`"></i>
                                <div>{{ slotProps.option.label }}</div>
                            </div>
                        </template>
                    </Dropdown>
                </div>
            </td>
            <td>
                <div class="relative text-center mx-auto w-fit z-10" v-if="selectedNode">
                    <Button severity="primary" rounded class="relative shadow-[inset_0_25px_50px_-12px_rgb(0_0_0_/_0.25)] shadow-indigo-500/50" @click="modalIsVisible = true">
                        <div class="flex">
                            <div>
                                <div class="block text-sm">
                                    Read more about
                                </div>
                                <div class="block font-bold">{{ selectedNode.label }}</div>
                            </div>
                        </div>
                    </Button>
                    <!-- <div class="absolute top-0 bottom-0 left-0 right-0 ring-white rounded-[2rem] animate-pulse" style="z-index: -1;"></div> -->
                </div>
            </td>
            <td></td>
        </table>
    </div>
    <div id="graph-container"></div>
    <template>
        <NodeInfoModal v-model:infoUrl="selectedNodeInfoUrl" v-model:isVisible="modalIsVisible"></NodeInfoModal>
    </template>
</template>
<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import ForceGraph3D from "3d-force-graph";
import * as THREE from '//unpkg.com/three/build/three.module.js';
import { CSS2DRenderer, CSS2DObject } from '//unpkg.com/three/examples/jsm/renderers/CSS2DRenderer.js';
// import { UnrealBloomPass } from '//unpkg.com/three/examples/jsm/postprocessing/UnrealBloomPass.js';
import SpriteText from "https://esm.sh/three-spritetext";
import Dropdown from "primevue/dropdown";
import Button from "primevue/button";
import NodeInfoModal from "./NodeInfoModal.vue";
import { NodeType } from "../types/graph";
import { Visitor, RandomVisitor } from "../utils/visitor";

const graph = ref();
const visitor = ref<Visitor>();
const traverseAnimation = ref<boolean>(true);
const lastInteractionTime = ref<number>(Date.now());
const selectedNode = ref();
const modalIsVisible = ref<boolean>(false);

const initialize = async () => {

    const graphContainer = document.getElementById('graph-container');

    if (!graphContainer) {
        throw new Error("element graph-container was not found");
    }

    const gData = await (await fetch("/public/graph-elements.json")).json();

    if (!gData) {
        throw new Error("graph-elements.json was not found");
    }

    graph.value = ForceGraph3D({ extraRenderers: [new CSS2DRenderer()] });
    graph.value(graphContainer)
        .graphData(gData)
        .showNavInfo(false)
        .nodeAutoColorBy("name")
        .linkDirectionalParticles(2)
        .linkDirectionalParticleSpeed(d => 2 * 0.001)
        // .linkAutoColorBy("source")
        // .linkWidth(.2)
        // .backgroundColor('#000003')
        .nodeThreeObject(node => {
            if (node.group == NodeType.TEAM_MEMBER) {

                // const nodeEl = document.createElement('div');
                // nodeEl.textContent = node.name;
                // nodeEl.style.color = 'white';
                // // nodeEl.style.color = node.color;
                // nodeEl.className = 'node-label';
                // const nameObject = new CSS2DObject(nodeEl);
                // nameObject.position.set( 0, 0, 0 );

                const spriteText = new SpriteText(node.name);
                spriteText.material.depthWrite = false; // make sprite background transparent
                // spriteText.color = node.color;
                spriteText.color = 'white';
                spriteText.textHeight = 1.2;
                spriteText.position.set(0, -10, 0)

                const imgTexture = new THREE.TextureLoader().load(`/src/assets/images/team/${node.id}.jpg`);
                imgTexture.colorSpace = THREE.SRGBColorSpace;
                const material = new THREE.SpriteMaterial({ map: imgTexture });
                const spriteImg = new THREE.Sprite(material);
                spriteImg.scale.set(12, 16);

                const group = new THREE.Group();
                group.add(spriteImg);
                group.add(spriteText);

                return group;
            } else {
                const sprite = new SpriteText(node.name);
                sprite.material.depthWrite = false; // make sprite background transparent
                sprite.color = node.color;
                sprite.textHeight = 4;
                return sprite;
            }
        })
        // .nodeThreeObjectExtend(node => {
        //     // return node.group == NodeType.PROJECT;
        //     return true;
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

    if (!node) return;

    if (typeof node === "string") {
        node = graph.value.graphData().nodes.find((n: any) => n.id == node);
    }

    const nodes = optionNodes.value![0].items.concat(optionNodes.value![1].items);
    selectedNode.value = nodes.find(n => n.value == node.id);

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

const selectedNodeInfoUrl = computed(() => {
    return selectedNode.value?.url;
});

//#region Visitor

const initializeVisitor = (time: number = 6000) => {
    visitor.value = new RandomVisitor(graph.value.graphData());
    setInterval(() => {
        if (traverseAnimation.value) {
            visitor.value?.moveNext();
            const currentNodeId = visitor.value?.getCurrentNodeId();
            fitNodeIntoView(currentNodeId);
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

//#region Filter

const optionNodes = computed(() => {
    if (graph.value) {

        const groupedItems: { label: string; items: { label: string; value: string; color: string; url: string; }[] }[] = [{
            label: "Team Members",
            items: [],
        }, {
            label: "Projects",
            items: []
        }];

        graph.value.graphData().nodes.map((n: any) => {
            groupedItems[n.group == NodeType.PROJECT ? 1 : 0].items.push({
                label: n.name,
                value: n.id,
                color: n.color,
                url: n.info_url
            });
        });

        return groupedItems;
    }
});

//#endregion

onMounted(async () => {
    await initialize();
    initializeVisitor();
    document.body.addEventListener('touchstart', stopTraverseAnimation);
    document.body.addEventListener('click', stopTraverseAnimation);
})
</script>
<style scoped></style>