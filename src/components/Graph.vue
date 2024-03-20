<template>
    <div id="graph-container">
    </div>
    <div id="info-bar">
        {{ selectedNodeInfo }}
    </div>
</template>
<script setup lang="ts">
import * as d3 from "d3";
import { ref, onMounted } from 'vue';

const dataLocation: string = "/graph.json";
const data = ref<{ nodes: any[], links: any[] }>();
const selectedNodeInfo = ref();

const loadData = async (): Promise<any> => {
    return (await fetch(dataLocation)).json();
}

const initializeD3Graph = () => {

    if (!data.value) {
        throw new Error("Data has not been loaded");
    }

    // Specify the dimensions of the chart.
    const width = 928;
    const height = 680;

    // Specify the color scale.
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    // The force simulation mutates links and nodes, so create a copy
    // so that re-evaluating this cell produces the same result.
    const links = data.value.links.map(d => ({ ...d }));
    const nodes = data.value.nodes.map(d => ({ ...d }));

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
        .attr("style", "max-width: 100%; height: auto; border: solid 1px black");

    // Add a line for each link, and a circle for each node.
    const link = svg.append("g")
        .attr("stroke", "#999")
        .attr("stroke-opacity", 0.6)
        .selectAll("line")
        .data(links)
        .join("line")
        .attr("stroke-width", (d: any) => Math.sqrt(d.value));

    const node = svg.append("g")
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5)
        .selectAll("circle")
        .data(nodes)
        .join("circle")
        .attr("r", 5)
        .attr("fill", (d: any) => color(d.group));

    node.append("title")
        .text((d: any) => d.id);

    // Add a drag behavior.
    node.call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    // Add click node behavior
    node.on("click", clickedNode);

    function clickedNode(e: PointerEvent, d: any) {
        selectedNodeInfo.value = JSON.stringify(d);
    }


    // Zoom functionalities

    svg.call(d3.zoom()
        .extent([[0, 0], [width, height]])
        .scaleExtent([1, 8])
        .on("zoom", zoomed));

    function zoomed({transform}: any) {
        node.attr("transform", transform);
        link.attr("transform", transform);
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

    return svg.node();
}


onMounted(async () => {
    data.value = await loadData();
    const svg = initializeD3Graph();
    document.getElementById("graph-container")?.append(svg);
})
</script>

<style scoped>
#graph-container {
  
}

#info-bar {
   
}
</style>
