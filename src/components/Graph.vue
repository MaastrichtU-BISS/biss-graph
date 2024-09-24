<template>
    <div class="h-[40px]">
        <div class="pt-4 mx-auto w-fit">
            <IconField>
                <InputIcon class="pi pi-search" />
                <InputText v-model="toSearch" placeholder="Search" />
            </IconField>
        </div>
    </div>
    <div id="graph-container">
    </div>
    <template>
        <div class="card flex justify-content-center">
            <Dialog v-model:visible="visibleModal" modal header="Node Info" :style="{ width: '50vw' }" dismissableMask
                :breakpoints="{ '1199px': '75vw', '575px': '90vw' }">
                <p class="m-0">
                {{ selectedNodeInfo }}
                </p>
            </Dialog>
        </div>
    </template>
</template>
<script setup lang="ts">
import * as d3 from "d3";
import { ref, onMounted, computed, watch } from 'vue';
import Dialog from 'primevue/dialog';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import InputText from 'primevue/inputtext';
import  {Graph, type Node, type Link} from "../types/graph.ts";

//Hello world

const dataLocation: string = "/biss-graph.json";
const graph = ref<Graph>(new Graph([],[]));
const selectedNodeInfo = ref();
const visibleModal = ref(false);
const toSearch = ref<string>("");
const svg = ref();

const loadData = async (): Promise<{nodes: Node[]; links: Link[]}> => {
    return (await fetch(dataLocation)).json();
}

const initializeD3Graph = (dataNodes: any[], dataLinks: any[]) => {

    if (!graph.value) {
        throw new Error("Data has not been loaded");
    }

    // Specify the dimensions of the chart.
    const width = 928;
    const height = 680;
    const radius = 7;

    // Specify the color scale.
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    // The force simulation mutates links and nodes, so create a copy
    // so that re-evaluating this cell produces the same result.
    const links = dataLinks.map(d => ({ ...d }));
    const nodes = dataNodes.map(d => ({ ...d }));

    // Create a simulation with several forces.
    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id((d: any) => d.id))
        .force("charge", d3.forceManyBody())
        .force("x", d3.forceX())
        .force("y", d3.forceY());

    // Create the SVG container.
    const svg = d3.create("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [-width / 2, -height / 2, width, height])
        .attr("style", "width: 100vw; height: calc(100vh - 40px)");

    // Add a line for each link, and a circle for each node.
    const link = svg.append("g")
        .attr("stroke", "#999")
        .attr("stroke-opacity", 0.6)
        .selectAll("line")
        .data(links)
        .join("line")
        .attr("stroke-width", (d: any) => 2);

    const node = svg.append("g")
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5)
        .selectAll("circle")
        .data(nodes)
        .join("circle")
        .attr("r", radius)
        .attr("id", (d: any) => d.id)
        .attr("fill", (d: any) => color(d.group));

    node.append("title")
        .text((d: any) => d.group == "project" ? d.title : d.full_name);

    // Add a drag behavior.
    node.call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    // Add click node behavior
    node.on("click", clickedNode);

    // Zoom functionalities
    
    svg.call(d3.zoom()
        .extent([[0, 0], [width, height]])
        .scaleExtent([1, 8])
        .on("zoom", zoomed));
    
    function zoomed({ transform }: any) {
        node.attr("transform", transform);
        link.attr("transform", transform);
    }

    function clickedNode(e: PointerEvent, d: any) {

        //open modal
        selectedNodeInfo.value = d;
        visibleModal.value = true;

        //clear previously highlighted nodes 
        d3
            .selectAll("circle")
            .style("fill", (d: any) => color(d.group));

        // highlight selected node and its neighbours
        const neighbours_id: string[] = [d.id];

        links.map((e: any) => {
            if (e.target.id == d.id) {
                neighbours_id.push(e.source.id);
            } else if (e.source.id == d.id) {
                neighbours_id.push(e.target.id);
            }
        });

        d3.selectAll("circle").filter((n: any) =>
            neighbours_id.includes(n.id)
        ).style("fill", 'red');
    }

    // Set the position attributes of links and nodes each time the simulation ticks.
    simulation.on("tick", () => {
        link
            .attr("x1", (d: any) => d.source.x)
            .attr("y1", (d: any) => d.source.y)
            .attr("x2", (d: any) => d.target.x)
            .attr("y2", (d: any) => d.target.y);

        node
            .attr("cx", (d: any) => d.x)
            .attr("cy", (d: any) => d.y);
    });

    // Reheat the simulation when drag starts, and fix the subject position.
    function dragstarted(event: any) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
    }

    // Update the subject (dragged node) position during drag.
    function dragged(event: any) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
    }

    // Restore the target alpha so the simulation cools after dragging ends.
    // Unfix the subject position now that it’s no longer being dragged.
    function dragended(event: any) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
    }

    // When this cell is re-run, stop the previous simulation. (This doesn’t
    // really matter since the target alpha is zero and the simulation will
    // stop naturally, but it’s a good practice.)
    // invalidation.then(() => simulation.stop());

    return svg;
}

// filter logic
const filteredGraph = computed((): Graph => {
    if(toSearch.value?.length) {
        const filteredNodes = graph.value?.getNodes.filter((n: Node) => {
            return n.id.toLowerCase().startsWith(toSearch.value.toLowerCase());
        }).map((n: Node) => n.id) || [];

        return graph.value?.subGraph(filteredNodes);
    } 
    
    return new Graph(graph.value.getNodes, graph.value?.getLinks);
});

const updateGraph = async () => {
    if(!graph.value) return
    svg.value = initializeD3Graph(filteredGraph.value.getNodes, filteredGraph.value.getLinks);
    document.getElementById("graph-container")?.replaceChildren();
    document.getElementById("graph-container")?.append(svg.value.node());
};

watch(filteredGraph, () => {
    updateGraph();
})

onMounted(async () => {
    const data = await loadData();
    graph.value = new Graph(data.nodes, data.links);
    updateGraph();
})
</script>