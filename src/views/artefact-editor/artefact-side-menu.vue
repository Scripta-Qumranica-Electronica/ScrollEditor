<template>
    <div id="artefact-side-menu" :class="{ 'fixed-header': scrolled }" role="tablist">
        <section>
            <b-card no-body class="mb-1">
                <b-card-header header-tag="header" class="p-1">
                    <b-button block href="#" variant="info">{{$t('home.editorParameters')}}</b-button>
                </b-card-header>
                <b-collapse
                    style="display:block;"
                    id="accordion-params"
                    accordion="my-accordion-side"
                >
                    <b-card-body>
                        <section>
                            <div class="row">
                                <div class="col-5">Zoom: {{formatTooltip()}}</div>
                                <div class="col">
                                    <b-form-input
                                        ref="zoomRef"
                                        type="range"
                                        min="0.1"
                                        max="1"
                                        step="0.01"
                                        v-model="zoom"
                                    ></b-form-input>
                                    <!-- v-b-tooltip.hover :title="formatTooltip()"-->
                                </div>
                            </div>
                            <div class="row">
                                <div class="col">
                                    <b-form-input type="number" v-model="rotationAngle" />
                                </div>
                            </div>
                        </section>
                    </b-card-body>
                </b-collapse>
            </b-card>
        </section>
        <section>
            <b-card no-body class="mb-1">
                <b-card-header header-tag="header" class="p-1" role="tab">
                    <b-button block href="#" v-b-toggle.accordion-images variant="info">Images</b-button>
                </b-card-header>
                <b-collapse id="accordion-images" accordion="my-accordion-side" role="tabpanel">
                    <b-card-body>
                        <image-settings
                            :imageStack="imageStack"
                            :params="params"
                            @imageSettingChanged="onImageSettingChanged($event)"
                        />
                    </b-card-body>
                </b-collapse>
            </b-card>
        </section>
        <section>
            <b-card no-body class="mb-1">
                <b-card-header header-tag="header" class="p-1" role="tab">
                    <b-button
                        block
                        href="#"
                        v-b-toggle.accordion-actions
                        variant="info"
                    >{{$t('misc.actions')}}</b-button>
                </b-card-header>
                <b-collapse id="accordion-actions" accordion="my-accordion-side" role="tabpanel">
                    <b-card-body>
                        <section class="center-btn">
                            <b-button
                                @click="onRotateClick(-10)"
                                v-b-tooltip.hover.bottom
                                :title="$t('misc.leftRotate')"
                            >
                                <font-awesome-icon icon="undo"></font-awesome-icon>
                            </b-button>
                            <b-button
                                @click="onRotateClick(10)"
                                v-b-tooltip.hover.bottom
                                :title="$t('misc.RightRotate')"
                            >
                                <font-awesome-icon icon="redo"></font-awesome-icon>
                            </b-button>
                        </section>
                        <section class="center-btn">
                            <b-button v-if="!saving" @click="onSave()">{{$t('misc.save')}}</b-button>
                            <b-button v-if="saving" disabled class="disable">
                                Saving...
                                <font-awesome-icon icon="spinner" spin></font-awesome-icon>
                            </b-button>
                        </section>
                    </b-card-body>
                </b-collapse>
            </b-card>
        </section>
    </div>
</template>

<script lang="ts">
import Vue, { PropOptions } from 'vue';
import { ImagedObject } from '@/models/imaged-object';
import { Artefact } from '@/models/artefact';
import { ArtefactEditorParams, ArtefactEditorParamsChangedArgs } from './types';
import ImageSettingsComponent from '@/components/image-settings/ImageSettings.vue';
import ImagedObjectService from '../../services/imaged-object';
import { ImageStack } from '../../models/image';
import {
    SingleImageSetting,
    ImageSetting
} from '../../components/image-settings/types';

export default Vue.extend({
    name: 'artefcat-side-menu',
    components: {
        'image-settings': ImageSettingsComponent
    },
    data() {
        return {
            errorMessage: '',
            imagedObjectService: new ImagedObjectService(),
            imageStack: {} as ImageStack
        };
    },
    props: {
        artefact: Object as () => Artefact,
        params: Object as () => ArtefactEditorParams,
        saving: Boolean
    },
    computed: {
        editionId(): number {
            return parseInt(this.$route.params.editionId);
        },
        scrolled(): boolean {
            return true;
        },
        zoom: {
            get(): number {
                return this.params.zoom;
            },
            set(val: any) {
                this.params.zoom = parseFloat(val);
                this.notifyChange('zoom', val);
            }
        },
        rotationAngle: {
            get(): number {
                return this.params.rotationAngle;
            },
            set(val: any) {
                this.params.rotationAngle = parseFloat(val);
                this.notifyChange('rotationAngle', val);
            }
        }
    },
    async mounted() {
        await this.$state.prepare.edition(this.artefact.editionId);
        const imagedObject = this.$state.imagedObjects.find(
            this.artefact.imagedObjectId
        );
        if (!imagedObject) {
            throw new Error(
                `Can't find ImagedObject ${this.artefact.imagedObjectId} for artefact ${this.artefact.id}`
            );
        }
        this.imageStack = imagedObject.getImageStack(this.artefact.side)!;
    },
    methods: {
        formatTooltip(): string {
            return (this.zoom * 100).toFixed(0) + '%';
        },
        notifyChange(paramName: string, paramValue: any) {
            const args = {
                property: paramName,
                value: paramValue,
                params: this.params
            } as ArtefactEditorParamsChangedArgs;
            this.$emit('paramsChanged', args);
        },
        onImageSettingChanged(settings: ImageSetting) {
            this.notifyChange('imageSettings', this.params.imageSettings);
        },
        onRotateClick(degrees: number) {
            this.params.rotationAngle += degrees;
            this.notifyChange('rotationAngle', this.params.rotationAngle);
        },
        onSave() {
            this.$emit('save');
        }
    }
});
</script>

<style lang="scss" scoped>
#artefact-side-menu {
    touch-action: pan-y;
    top: 0;
    right: 0;
}
span.selected {
    font-weight: bold;
}
section {
    margin-bottom: 20px;
}
button {
    margin-right: 10px;
}
.btn-info {
    background-color: #6c757d;
    border-color: #6c757d;
}
</style>
