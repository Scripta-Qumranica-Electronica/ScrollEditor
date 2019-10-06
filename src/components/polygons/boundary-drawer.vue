<template>
    <artefact-svg :artefact="artefact"
                  :aspect-ratio="aspectRatio"
                  v-slot:default="slotProps">
        <rect :width="boundingBox.width" :height="boundingBox.height" style="stroke-width:3;stroke:rgb(255,255,0)" />
    </artefact-svg>
</template>

<script lang="ts">
import { Component, Prop, Vue, Mixins } from 'vue-property-decorator';
import { Artefact } from '@/models/artefact';
import { ImageSetting, SingleImageSetting } from '@/components/image-settings/types';
import ArtefactDataMixin from '@/components/artefact/artefact-data-mixin';
import ArtefactSvg from '@/components/artefact-svg.vue';

@Component({
    name: 'boundary-drawer',
    components: { 'artefact-svg': ArtefactSvg },
})
export default class BoundaryDrawer extends Mixins(ArtefactDataMixin) {
}

</script>

<style lang="scss" scoped>
</style>
