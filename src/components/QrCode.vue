<template>
    <span class="qr" :aria-label="url" role="img" v-html="svg"></span>
</template>
<script setup lang="ts">
import { ref, watchEffect } from "vue";
import QRCode from "qrcode";

/** A QR code for `url`, as crisp inline SVG. */
const props = defineProps<{ url: string }>();
const svg = ref("");

watchEffect(async () => {
    svg.value = await QRCode.toString(props.url, { type: "svg", margin: 0, errorCorrectionLevel: "M" });
});
</script>
<style scoped>
.qr {
    display: block;
    line-height: 0;
}

.qr :deep(svg) {
    width: 100%;
    height: 100%;
}
</style>
