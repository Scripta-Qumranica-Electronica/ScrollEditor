<template>
    <div class="wrapper" id="scroll-editor">
        <div id="sidebar" class="imaged-object-menu-div col-xl-2 col-lg-3 col-md-4"
         :class="{ active : isActive }">
            <scroll-menu></scroll-menu>
        </div>
        <div class="container col-xl-12 col-lg-12 col-md-12">
            <div class="row">
                <div id="buttons-div">
                    <b-button
                        type="button"
                        class="sidebarCollapse"
                        @click="sidebarClicked()"
                        v-b-tooltip.hover.bottom
                        :title="$t('misc.collapsedsidebarObject')"
                    >
                        <i class="fa fa-align-justify"></i>
                    </b-button>
                </div>
                <div class="imaged-object-container" :class="{active: isActive}">
                <scroll-layer></scroll-layer>
                </div>
            </div>
        </div>
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
import ScrollLayer from './scroll-layer.vue';

@Component({
    name: 'scroll-editor',
    components: {
        Waiting,
        'scroll-menu': ScrollMenu,
        'scroll-layer': ScrollLayer
    }
})
export default class ScrollEditor extends Vue {
     private isActive = false;
     private editionId: number = 0;
       private sidebarClicked() {
        this.isActive = !this.isActive;
    }

    private async mounted() {
        this.editionId = parseInt(this.$route.params.editionId, 10);
        await this.$state.prepare.edition(this.editionId);
    }

    private async beforeRouteUpdate(to, from, next) {
        this.editionId = parseInt(to.params.editionId, 10);
        await this.$state.prepare.edition(this.editionId);
        next();
    }
}
</script>

<style lang="scss" scoped>
.imaged-object-menu-div {
    height: calc(100vh - 63px);
    overflow: hidden;
}
.sidebarCollapse {
    width: 40px;
    height: 40px;
    display: block;
    margin-bottom: 5px;
}

#scroll-editor {
    overflow: hidden;
    height: calc(100vh - 63px);
}
#buttons-div {
    background-color: #eff1f4;
}
#sidebar {
    min-width: 250px;
    max-width: 250px;
    transition: all 0.6s cubic-bezier(0.945, 0.02, 0.27, 0.665);
    transform-origin: center left; /* Set the transformed position of sidebar to center left side. */
}

#sidebar.active {
    margin-left: -250px;
    transform: rotateY(100deg); /* Rotate sidebar vertically by 100 degrees. */
}
.imaged-object-container {
    overflow: auto;
    position: relative;
    padding: 0;
    height: calc(100vh - 63px);
    width: calc(100vw - 290px);
    touch-action: none;
}
.imaged-object-container.active {
    overflow: auto;
    position: relative;
    padding: 0;
    height: calc(100vh - 63px);
    width: calc(100vw - 40px);
}
.wrapper {
    display: flex;
    align-items: stretch;
    perspective: 1500px;
}

</style>
