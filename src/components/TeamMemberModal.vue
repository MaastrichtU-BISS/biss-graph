<template>
    <Dialog v-model:visible="isVisible" modal header="Node Info" :style="{ width: '50vw' }" dismissableMask
        :breakpoints="{ '1199px': '75vw', '575px': '90vw' }">
        <p class="m-0">
            {{ nodeInfo }}
        </p>
    </Dialog>
</template>
<script setup lang="ts">
import Dialog from 'primevue/dialog';

const nodeInfo = defineModel('nodeInfo');
const isVisible = defineModel('isVisible', { type: Boolean, default: false});

</script>