<template>
    <Dialog v-model:visible="isVisible" modal :style="{ width: '80vw', height: '80vh' }" dismissableMask
        :breakpoints="{ '1199px': '75vw', '575px': '90vw' }">
        <iframe :src="nodeInfo.info_url" frameborder="0" class="w-full h-[80vh]"></iframe>
    </Dialog>
</template>
<script setup lang="ts">
import Dialog from 'primevue/dialog';
import { type Node } from "../types/graph";

defineProps<{
    nodeInfo: Node
}>();

const isVisible = defineModel<boolean>('isVisible', { required: true, default: false} );

</script>