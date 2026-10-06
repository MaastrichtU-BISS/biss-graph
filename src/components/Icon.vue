<template>
    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
        stroke-linejoin="round" aria-hidden="true">
        <path v-for="(d, i) in paths[name]" :key="i" :d="d" />
    </svg>
</template>
<script setup lang="ts">
defineProps<{ name: keyof typeof paths }>();
</script>
<script lang="ts">
const paths = {
    close: ["M18 6 6 18", "M6 6l12 12"],
    sun: ["M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M12 2v2", "M12 20v2", "M4.9 4.9l1.4 1.4", "M17.7 17.7l1.4 1.4", "M2 12h2", "M20 12h2", "M4.9 19.1l1.4-1.4", "M17.7 6.3l1.4-1.4"],
    moon: ["M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"],
    filter: ["M3 5h18", "M6 12h12", "M10 19h4"],
    play: ["M7 4.5v15l12-7.5-12-7.5z"],
    zoomIn: ["M12 5v14", "M5 12h14"],
    zoomOut: ["M5 12h14"],
    search: ["M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z", "M21 21l-4.35-4.35"],
    back: ["M15 18l-6-6 6-6"],
    chevron: ["M9 18l6-6-6-6"],
    people: [
        "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",
        "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
        "M22 21v-2a4 4 0 0 0-3-3.87",
        "M16 3.13a4 4 0 0 1 0 7.75",
    ],
    projects: [
        "M12 2 2 7l10 5 10-5-10-5z",
        "M2 17l10 5 10-5",
        "M2 12l10 5 10-5",
    ],
    overview: [
        "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",
        "M3 3v5h5",
    ],
    open: ["M15 3h6v6", "M10 14 21 3", "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"],
    drag: [
        "M5 9l-3 3 3 3",
        "M9 5l3-3 3 3",
        "M15 19l-3 3-3-3",
        "M19 9l3 3-3 3",
        "M2 12h20",
        "M12 2v20",
    ],
    pinch: [
        "M15 3h6v6",
        "M9 21H3v-6",
        "M21 3l-7 7",
        "M3 21l7-7",
    ],
    tap: [
        "M9 9V4.5a1.5 1.5 0 0 1 3 0V12",
        "M12 11.5V10a1.5 1.5 0 0 1 3 0v2",
        "M15 11a1.5 1.5 0 0 1 3 0v2.5",
        "M18 12.5a1.5 1.5 0 0 1 3 0V16a6 6 0 0 1-6 6h-2c-2.2 0-3.6-.7-4.8-2.1L4.5 16.7a1.6 1.6 0 0 1 2.4-2.1L9 16.5",
    ],
};
</script>
<style scoped>
.icon {
    width: 1.35em;
    height: 1.35em;
    flex: none;
}
</style>
