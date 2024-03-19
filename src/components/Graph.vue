<template>
    {{ graph }}
</template>
<script setup lang="ts">

import { ref, onMounted } from 'vue';

const graphLocation: string = "/graph.json";
const graph = ref(null);

const loadGraph = async (): Promise<any> => {
    return (await fetch(graphLocation)).json();
}

onMounted(async () => {
    graph.value = await loadGraph();
    console.log(graph.value);
})
</script>

<style scoped></style>
