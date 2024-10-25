<template>
    <Dialog v-model:visible="isVisible" modal :style="{ width: '80vw', height: '80vh' }" dismissableMask
        :breakpoints="{ '1199px': '75vw', '575px': '90vw' }">
        <iframe :src="`${consts.bissWebsiteURL}/${nodeType}/iframe/${props.nodeInfo.id}`" frameborder="0" class="w-full h-[80vh]"></iframe>
    </Dialog>
</template>
<script setup lang="ts">
import Dialog from 'primevue/dialog';
import { computed } from "vue";
import * as consts from "../consts";
import { type Node, NodeType } from "../types/graph";

const props = defineProps<{
    nodeInfo: Node
}>();

const nodeType = computed( () => {
    return props.nodeInfo.group == NodeType.PROJECT ? "posts" : "team";
});

const isVisible = defineModel<boolean>('isVisible', { required: true, default: false} );

</script>