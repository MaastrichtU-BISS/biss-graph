<template>
    <Dialog v-model:visible="isVisible" modal :style="{ width: '60vw' }" dismissableMask>
        <template #container>
            <div class="relative h-[70vh]">
                <iframe :src="infoUrl" frameborder="0" class="w-full min-h-[70vh] rounded-lg"></iframe>
                <Button icon="pi pi-times" class="absolute left-3 bottom-3" @click="close" severity="secondary" outlined rounded aria-label="Cancel" />
            </div>
        </template>
    </Dialog>
</template>
<script setup lang="ts">
import Button from 'primevue/button'
import Dialog from 'primevue/dialog';

const isVisible = defineModel<boolean>('isVisible', { required: true, default: false} );
const infoUrl = defineModel<string>('infoUrl', { required: false } );

const close = () => {
    isVisible.value = false;
}
    
</script>
<style>
.p-dialog-content {
    padding: 0;
    background-color: white !important;
}

.p-dialog-header {
    background-color: white !important;
    /* border-bottom: 1px gray solid; */
}
</style>