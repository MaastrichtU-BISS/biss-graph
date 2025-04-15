<template>
    <header class="absolute top-0 text-center flex w-full z-10 align-middle" style="background-color: rgba(0,0,17,.5);">
        <h1 class="text-3xl font-semibold mx-auto z-50 my-4">
            BISS is like the A-team, but with professors from Maastricht University
        </h1>
    </header>
    <footer class="absolute bottom-0 w-full">
        <div class="grid grid-cols-3 items-end p-2">
            <div class="w-fit z-10 relative">
                <Dropdown v-model="selectedNode" :options="optionNodes" optionLabel="label" optionGroupLabel="label"
                    optionGroupChildren="items" placeholder="Search" class="w-full min-w-[300px]" showClear
                    @change="fitNodeIntoView($event.value?.value)">
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
            <div class="text-center mx-auto w-fit z-10 flex gap-2 align-middle pb-2" style="margin-right: 40px">
                <div class="flex gap-6 align-middle">
                    <Button icon="pi pi-search-minus" severity="secondary" rounded variant="outlined"
                        @mousedown="heldDown(-1)" @mouseup="release" @touchstart="heldDown(-1)" @touchend="release" />
                    <Slider v-model="displayedZoom" @update:modelValue="zoomSliderChanged" :min="MIN_DISTANCE"
                        :max="MAX_DISTANCE" :step="1" class="w-56 self-center" />
                    <Button icon="pi pi-search-plus" severity="secondary" rounded variant="outlined"
                        @mousedown="heldDown(+1)" @mouseup="release" @touchstart="heldDown(+1)" @touchend="release" />
                </div>
                <img src="/src/assets/images/finger-tapping.gif" height="40" width="40" />
            </div>
            <div class="relative z-10 w-[350px] justify-self-end border border-white border-solid rounded-lg">
                <Card class="p-0">
                    <template #title>
                        <div class="flex justify-around items-center">
                            <div>
                                <img src="/src/assets/images/biss_um_logo.png" height="120px">
                            </div>

                            <div class="text-center">
                                <img src="/src/assets/images/biss_qr_code.png" height="100px">
                                <div class="text-xs">biss-institute.com </div>
                            </div>
                        </div>
                    </template>
                    <template #content>
                        <ul class="my-0">
                            <li>
                                <p class="m-0 text-sm">
                                    Discover which projects our team members are involved with!
                                </p>
                            </li>
                            <li>
                                <p class="text-sm">
                                    Interact with the screen by tapping team members and projects or
                                </p>
                            </li>
                            <li>
                                <p class="text-sm">
                                    Check out our website by scanning the QR code above.
                                </p>
                            </li>
                        </ul>
                    </template>
                </Card>
            </div>
        </div>
    </footer>
    <main id="graph-container"></main>
    <template>
        <NodeInfoModal v-model:infoUrl="selectedNodeInfoUrl" v-model:isVisible="modalIsVisible"></NodeInfoModal>
    </template>
</template>
<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue';
import ForceGraph3D from "3d-force-graph";
import * as THREE from "three";
import SpriteText from "three-spritetext";
import Dropdown from "primevue/dropdown";
import Slider from 'primevue/slider';
import Button from "primevue/button";
import Card from "primevue/card";
import NodeInfoModal from "./NodeInfoModal.vue";
import { NodeType } from "../types/graph";
import { Visitor, RandomVisitor } from "../utils/visitor";

const graph = ref();
const visitor = ref<Visitor>();
const traverseAnimation = ref<boolean>(true);
const lastInteractionTime = ref<number>(Date.now());
const selectedNode = ref();
const modalIsVisible = ref<boolean>(false);

const TEAM_MEMBERS_TOTAL = ref(0);
const teamMembersLoaded = ref(0);

const teamMemberNodes: any = {};

const MIN_DISTANCE = 0;
const MAX_DISTANCE = 400;
const ZOOM_OFFSET = 40;
const displayedZoom = ref<number>(MAX_DISTANCE);

const heldDownIntervalId = ref<number>();

const zoomSliderChanged = (newZoom: number) => {
    applyZoom(newZoom);
};

const applyZoom = (newZoom: number) => {

    if (newZoom < MIN_DISTANCE || newZoom > MAX_DISTANCE) return false;

    displayedZoom.value = newZoom;

    const realZoom = MAX_DISTANCE - newZoom + ZOOM_OFFSET
    graph.value.controls().maxDistance = realZoom;
    graph.value.controls().minDistance = realZoom;

    return true;
}

const heldDown = (delta: number) => {
    heldDownIntervalId.value = setInterval(() => {
        applyZoom(displayedZoom.value + delta)
    }, 10);
}

const release = () => {
    clearInterval(heldDownIntervalId.value);
}

const initialize = async () => {

    const graphContainer = document.getElementById('graph-container');

    if (!graphContainer) {
        throw new Error("element graph-container was not found");
    }

    const gData = await (await fetch("/graph-elements.json")).json();

    const teamMembers = gData.nodes.filter((n: any) => n.group == NodeType.TEAM_MEMBER);
    TEAM_MEMBERS_TOTAL.value = teamMembers.length;
    teamMembers.forEach((n: any) => {
        createSpriteWithText(n.id, `/src/assets/images/team/${n.id}.jpg`, n.name);
    });

    if (!gData) {
        throw new Error("graph-elements.json was not found");
    }

    graph.value = ForceGraph3D();
    graph.value(graphContainer)
        .graphData(gData)
        .nodeLabel('')
        .showNavInfo(false)
        .nodeAutoColorBy("name")
        .linkDirectionalParticles(2)
        .linkDirectionalParticleSpeed(d => 2 * 0.001)
        .linkWidth(.2)
        .onNodeClick((node: any) => {
            fitNodeIntoView(node);
        })
        .onNodeDragEnd((node: any) => {
            fitNodeIntoView(node);
        });

    // Spread nodes a little wider
    graph.value.d3Force('charge').strength(-120);

    applyZoom(0);

};

const highlightEdges = (n: any) => {
    const conectedLinks = graph.value.graphData().links.filter((l: any) => {
        return l.source.id == n?.id || l.target.id == n?.id;
    });

    graph.value
        // .linkWidth(l => conectedLinks.includes(l) ? .3 : .2)
        .linkDirectionalParticleSpeed(l => conectedLinks.includes(l) ? 0.004 : 0.002)
        .linkDirectionalParticles(l => conectedLinks.includes(l) ? 4 : 2)
        .linkWidth(l => conectedLinks.includes(l) ? .3 : 0)
        .linkColor(l => conectedLinks.includes(l) ? '#f5dd42' : null)
};

const fitNodeIntoView = (node: any, highlight: boolean = true) => {

    if (!node) return;

    if (node?.id == selectedNode.value?.value) {
        modalIsVisible.value = true;
    }

    if (typeof node === "string") {
        node = graph.value.graphData().nodes.find((n: any) => n.id == node);
    }

    if (highlight) {
        highlightEdges(node);
    }

    const nodes = optionNodes.value![0].items.concat(optionNodes.value![1].items);
    selectedNode.value = nodes.find(n => n.value == node.id);

    graph.value.controls().maxDistance = 5000;
    graph.value.controls().minDistance = 0.1;

    // Aim at node from outside it
    displayedZoom.value = MAX_DISTANCE;
    const distance = ZOOM_OFFSET;
    const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);

    const newPos = node.x || node.y || node.z
        ? { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }
        : { x: 0, y: 0, z: distance }; // special case if node is in (0,0,0)

    graph.value.cameraPosition(
        newPos, // new position
        node, // lookAt ({ x, y, z })
        3000  // ms transition duration
    )

    setTimeout(() => {
        applyZoom(MAX_DISTANCE);
    }, 3001);
};

const selectedNodeInfoUrl = computed(() => {
    return selectedNode.value?.url;
});
// Function to create a sprite with an image and text
const createSpriteWithText = (id: string, imagePath: string, text: string) => {
    // Create a canvas to draw the image and text
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Load the image to draw onto the canvas
    const image = new Image();
    image.src = imagePath;

    image.onload = () => {

        const size = Math.min(image.width, image.height);
        canvas.width = canvas.height = size;
        const radius = size / 2;

        // crop image to circle
        ctx.save();
        ctx.beginPath();
        ctx.arc(radius, radius, radius, 0, Math.PI * 2);
        ctx.clip();


        // Draw the image onto the canvas
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

        // black semitransparent rectangle
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';

        ctx.fillRect(0, radius * 1.5, size, radius * 1.5);

        ctx.restore(); // Restore the state to remove clipping

        // Add the text below the image
        ctx.font = '21px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, radius, radius * 1.75);

        // Create a texture from the canvas
        const texture = new THREE.Texture(canvas);
        texture.needsUpdate = true; // Make sure the texture updates when the canvas is ready
        texture.colorSpace = THREE.SRGBColorSpace;

        // Create a sprite material with the texture
        const material = new THREE.SpriteMaterial({ map: texture });

        // Create the sprite
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(12, 12, 1)
        sprite.position.set(0, 0, 0);

        texture.repeat.set(1, 1);
        texture.center.set(0.5, 0.5);

        teamMemberNodes[id] = sprite;
        teamMembersLoaded.value++;
    };
};

const allTeamMembersLoaded = computed(() => {
    return TEAM_MEMBERS_TOTAL.value != 0 && teamMembersLoaded.value == TEAM_MEMBERS_TOTAL.value;
});

watch(allTeamMembersLoaded, (newVal) => {
    if (newVal) {
        graph.value.nodeThreeObject((node: any) => {
            if (node.group == NodeType.TEAM_MEMBER) {
                return teamMemberNodes[node.id];
            } else {
                const sprite = new SpriteText(node.name);
                sprite.material.depthWrite = true; // make sprite background transparent
                sprite.color = node.color;
                sprite.backgroundColor = '#000011';
                sprite.padding = 1;
                sprite.borderColor = 'white';
                sprite.borderWidth = .07;
                sprite.border = 'solid';
                sprite.borderRadius = 2;
                sprite.textHeight = 4;
                return sprite;
            }
        });
    }
});

//#region Visitor

const initializeVisitor = (time: number = 15000) => {
    visitor.value = new RandomVisitor(graph.value.graphData());
    moveVisitor();
    setInterval(() => {
        if (traverseAnimation.value) {
            moveVisitor();
        } else {
            tryResumeTraverseAnimation(time);
        }
    }, time);
};

const moveVisitor = () => {
    visitor.value?.moveNext();
    const currentNodeId = visitor.value?.getCurrentNodeId();
    fitNodeIntoView(currentNodeId, false);
}

// this has to be called inside of a setInterval. Every x seconds
const tryResumeTraverseAnimation = (time: number = 15000) => {
    // x seconds have passed since the last user interaction
    if ((((Date.now() - lastInteractionTime.value)) / 1000) > (time / 1000)) {
        modalIsVisible.value = false;
        traverseAnimation.value = true;
        moveVisitor();
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

        const groupedItems: { label: string; items: { label: string; value: string; color: string; url: string; group: string }[] }[] = [{
            label: "Projects",
            items: [],
        }, {
            label: "Team Members",
            items: []
        }];

        graph.value.graphData().nodes.map((n: any) => {
            groupedItems[n.group == NodeType.PROJECT ? 0 : 1].items.push({
                label: n.name,
                value: n.id,
                color: n.color,
                url: n.info_url,
                group: n.group
            });
        });

        return groupedItems;
    }
});

//#endregion

onMounted(async () => {
    console.log('Creating graph...')
    await initialize();
    console.log('Loading textures...');
    initializeVisitor(300000);
    document.body.addEventListener('touchstart', stopTraverseAnimation);
    document.body.addEventListener('click', stopTraverseAnimation);
    document.body.addEventListener('mousemove', stopTraverseAnimation);
    document.body.addEventListener('mousedown', stopTraverseAnimation);
    document.body.addEventListener('focus', stopTraverseAnimation);
    console.log('Ready');

    document.addEventListener('contextmenu', function (e) {
        e.preventDefault();
    });
})
</script>

<style>
.p-card-body {
    padding-top: 10px;
    padding-bottom: 0;
    padding-left: 0;
    padding-right: 0;
}
</style>