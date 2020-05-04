<template>
    <div>
     layer 

    </div>
</template>

<!-- <script src="https://unpkg.com/vue-toasted"></script>-->
<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import Waiting from '@/components/misc/Waiting.vue';
import ImagedObjectService from '@/services/imaged-object';
import EditionService from '@/services/edition';
import { ImagedObject } from '@/models/imaged-object';
import { Artefact } from '@/models/artefact';
import ImagedObjectMenu from '@/views/imaged-object-editor/imaged-object-menu.vue';
import {
    ImagedObjectEditorParams,
    EditorParamsChangedArgs,
    MaskChangeOperation,
    MaskChangedEventArgs,
    DrawingMode,
    ArtefactEditingData
} from '@/views/imaged-object-editor/types';
import { Position } from '@/models/misc';
import { IIIFImage } from '@/models/image';
import ImageLayer from '@/views/imaged-object-editor/image-layer.vue';
import ArtefactLayer from '@/views/imaged-object-editor/artefact-layer.vue';
import { Polygon } from '@/utils/Polygons';
import { Side } from '@/models/misc';
import { ZoomRequestEventArgs } from '@/models/editor-params';
import ArtefactService from '@/services/artefact';
import { DropdownOption } from '@/utils/helpers';
import BoundaryDrawer from '@/components/polygons/boundary-drawer.vue';
import Zoomer, { ZoomEventArgs } from '@/components/misc/zoomer.vue';
import { normalizeOpacity } from '@/components/image-settings/types';
import { addToArray } from '@/utils/collection-utils';
import EditionIcons from '@/components/cues/edition-icons.vue';
import ScrollMenu from './scroll-menu.vue';

@Component({
    name: 'scroll-layer',
    components: {
        Waiting,
    }
})
export default class ScrollLayer extends Vue {}

</script>

<style lang="scss" scoped>

</style>
