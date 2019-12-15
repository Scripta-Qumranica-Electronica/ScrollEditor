<template>
    <div id="imaged-object-menu" :class="{ 'fixed-header': scrolled }" role="tablist">
        <section>
            <b-card no-body class="mb-1">
                <b-card-header header-tag="header" class="p-1" role="tab">
                    <b-button block href="#" v-b-toggle.accordion-artefacts variant="info">Artefacts</b-button>
                </b-card-header>
                <b-collapse
                    id="accordion-artefacts"
                    visible
                    accordion="my-accordion"
                    role="tabpanel"
                >
                    <b-card-body>
                        <b-dropdown :text="sideFilter.displayName">
                            <b-dropdown-item
                                v-for="filter in sideOptions"
                                :key="filter.displayName"
                                @click="sideFilterChanged(filter)"
                            >{{filter.displayName}}</b-dropdown-item>
                        </b-dropdown>
                        <table>
                            <tr v-for="art in artefacts" :key="art.id">
                                <td>
                                    <span
                                        v-if="renameInputActive!==art"
                                        :class="{ selected: art===artefact }"
                                        @click="chooseArtefact(art)"
                                        :style="{'color': art.color}"
                                    >{{ art.name }}</span>
                                </td>
                                <td v-if="editable">
                                    <b-button
                                        v-if="renameInputActive!==art"
                                        class="btn btn-sm"
                                        id="rename"
                                        @click="openRename(art)"
                                    >Rename</b-button>
                                    <input v-if="renameInputActive===art" v-model="art.name" />
                                    <b-button
                                        v-if="!renaming && renameInputActive===art"
                                        class="btn btn-sm"
                                        :disabled="!art.name"
                                        @click="rename(art)"
                                    >Rename</b-button>
                                    <b-button
                                        v-if="renameInputActive===art && renaming"
                                        disabled
                                        class="disable btn btn-sm"
                                    >
                                        Renaming...
                                        <font-awesome-icon icon="spinner" spin></font-awesome-icon>
                                    </b-button>
                                    <b-button class="btn btn-sm" @click="deleteArtefact(art)">Delete</b-button>
                                </td>
                            </tr>
                        </table>
                        <b-btn
                            v-if="editable"
                            v-b-modal.modal="'newModal'"
                            class="btn btn-sm btn-outline"
                        >{{ $t('misc.new') }}</b-btn>
                    </b-card-body>
                </b-collapse>
            </b-card>
        </section>

        <b-modal
            id="newModal"
            ref="newArtRef"
            :title="$t('home.newArtefact')"
            @shown="newModalShown"
            @ok="newArtefact"
            :ok-title="$t('misc.create')"
            :cancel-title="$t('misc.cancel')"
            :ok-disabled="waiting || !canCreate"
            :cancel-disabled="waiting"
        >
            <form @submit.stop.prevent="newArtefact">
                <b-form-group :label="$t('home.newArtefactName')" label-for="newArtefactName">
                    <b-form-input
                        ref="newArtefactName"
                        id="newName"
                        v-model="newArtefactName"
                        type="text"
                        @keyup.enter="newArtefact"
                        required
                        :placeholder="$t('home.newArtefactName')"
                    ></b-form-input>
                </b-form-group>
                <p v-if="waiting">
                    {{ $t('home.creatingNewArtefact') }}...
                    <font-awesome-icon icon="spinner" spin></font-awesome-icon>
                </p>
                <p class="text-danger" v-if="errorMessage">{{ errorMessage }}</p>
            </form>
        </b-modal>

        <section v-if="artefact">
            <b-card no-body class="mb-1">
                <b-card-header header-tag="header" class="p-1" role="tab">
                    <b-button block href="#" v-b-toggle.accordion-images variant="info">Images</b-button>
                </b-card-header>
                <b-collapse id="accordion-images" accordion="my-accordion" role="tabpanel">
                    <b-card-body>
                        <image-settings
                            :imageStack="imagedObject.getImageStack(this.artefact.side)"
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
                        v-b-toggle.accordion-params
                        variant="info"
                    >{{$t('home.editorParameters')}}</b-button>
                </b-card-header>
                <b-collapse id="accordion-params" accordion="my-accordion" role="tabpanel">
                    <b-card-body>
                        <section>
                            <!-- zoom -->
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
                        </section>
                        <section v-if="artefact && artefact.mask">
                            <b-form-checkbox v-model="background">Background</b-form-checkbox>
                        </section>
                    
                        <section>
                            <b-form-checkbox v-model="highLight">HighLight</b-form-checkbox>
                        </section>
                    </b-card-body>
                </b-collapse>
            </b-card>
        </section>
         

        <section>
            <b-card no-body class="mb-1">
                <b-card-header header-tag="header" class="p-1" role="tab">
                    <b-button block href="#" v-b-toggle.accordion-actions variant="info">Actions</b-button>
                </b-card-header>
                <b-collapse id="accordion-actions" accordion="my-accordion" role="tabpanel">
                    <b-card-body>
                        <section class="center-btn">
                            <b-button @click="onRotateClick(-90)">
                                <font-awesome-icon icon="undo"></font-awesome-icon>
                            </b-button>
                            <b-button @click="onRotateClick(90)">
                                <font-awesome-icon icon="redo"></font-awesome-icon>
                            </b-button>
                        </section>
                        <section class="center-btn" v-if="editable">
                            <b-button
                                v-for="mode in [{name: 'Draw', val:'DRAW'}, {name: 'Erase', val: 'ERASE'}]"
                                :key="mode.val"
                                @click="onDrawChanged(mode.val)"
                                :pressed="modeChosen(mode.val)"
                            >{{ mode.name }}</b-button>
                        </section>
                        <section
                            class="center-btn"
                            v-if="editable"
                            v-shortcuts="[
              { shortcut: [ 'arrowleft' ], callback: undoModal },
            ]"
                        >
                            <b-button @click="undo()">Undo</b-button>
                            <b-button @click="redo()">Redo</b-button>
                        </section>
                        <section class="center-btn" v-if="editable">
                            <b-button v-if="!saving" @click="save()">{{$t('misc.save')}}</b-button>
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

import {
    ImagedObjectEditorParams,
    DrawingMode,
    EditorParamsChangedArgs
} from '@/views/imaged-object-editor/types';

import SingleImageSettingComponent from '@/components/image-settings/SingleImageSetting.vue';
import ImagedObjectService from '@/services/imaged-object';
import {
    SingleImageSetting,
    ImageSetting
} from '@/components/image-settings/types';
import ImageSettingsComponent from '@/components/image-settings/ImageSettings.vue';
import { Side } from '@/models/misc';
import ArtefactService from '@/services/artefact';
import { DropdownOption } from '@/utils/helpers';

/**
 * This component has a lot of emit functions.  Perhaps it will be better
 * to create a modular container that holds this menu and the possible
 * image view modules that can accompany it.  If we want the menu to be
 * a component, however, I see no way around using these emit functions.
 *
 * The props `artefactEditable` and `roiEditable` are switches that allow
 * the parent component to turn on/off certain menu functionality.
 */
export default Vue.extend({
    name: 'imaged-object-menu',
    components: {
        'single-image-setting': SingleImageSettingComponent,
        'image-settings': ImageSettingsComponent
    },
    props: {
        imagedObject: Object as () => ImagedObject,
        artefacts: {
            type: Array,
            default: () => []
        } as PropOptions<Artefact[]>,
        artefact: Object as () => Artefact,
        editable: Boolean,
        params: Object as () => ImagedObjectEditorParams,
        saving: Boolean,
        renaming: Boolean,
        renameInputActive: Object as () => Artefact,
        side: {
            type: String as () => Side
        }
    },
    data() {
        return {
            imagedObjectService: new ImagedObjectService(),
            artefactService: new ArtefactService(),
            errorMessage: '',
            waiting: false,
            newArtefactName: '',
            scrolled: '',
            sideFilter: {} as DropdownOption
        };
    },
    computed: {
        zoom: {
            get(): number {
                return this.params.zoom;
            },
            set(val: any) {
                this.params.zoom = parseFloat(val);
                this.notifyChange('zoom', val);
            }
        },
      background: {
            get(): boolean {
                return this.params.background;
            },
            set(val: boolean) {
                this.params.background = val;
                this.notifyChange('background', val);
            }
        },
        highLight: {
            get(): boolean {
                return this.params.highLight;
            },
            set(val: boolean) {
                this.params.highLight = val;
                this.notifyChange('highLight', val);
            }
        },

        sideOptions(): DropdownOption[] {
            const options = [] as DropdownOption[];

            if (!this.imagedObject) {
                return [];
            }

            if (this.imagedObject.recto) {
                options.push({ displayName: 'Recto', name: 'recto' });
            }

            if (this.imagedObject.verso) {
                options.push({ displayName: 'Verso', name: 'verso' });
            }

            return options;
        },
        canCreate(): boolean {
            return this.newArtefactName.trim().length > 0;
        },
        canUndo() {
            return true;
        },
        editionId(): number {
            return parseInt(this.$route.params.editionId);
        }
    },
    mounted() {
        // window.addEventListener('edition', this.handleScroll);
        const index = this.sideOptions.findIndex(a => a.name === this.side);
        if (index < 0) {
            throw new Error("Side has to be either 'recto' or 'verso'");
        }
        this.sideFilter = this.sideOptions[index];
    },
    methods: {
        onImageSettingChanged(settings: ImageSetting) {
            this.notifyChange('imageSettings', this.params.imageSettings);
        },
        onDrawChanged(val: any) {
            // DrawingMode
            const mode = DrawingMode[val];
            (this as any).params.drawingMode = mode;
            this.notifyChange('drawingMode', mode);
        },
        onRotateClick(degrees: number) {
            this.params.rotationAngle += degrees;
            this.notifyChange('rotationAngle', this.params.rotationAngle);
        },
        notifyChange(paramName: string, paramValue: any) {
            const args = {
                property: paramName,
                value: paramValue,
                params: this.params
            } as EditorParamsChangedArgs;
            this.$emit('paramsChanged', args);
        },
        formatTooltip(): string {
            return (this.zoom * 100).toFixed(0) + '%';
        },
        modeChosen(val: DrawingMode) {
            return (
                DrawingMode[val].toString() ===
                this.params.drawingMode.toString()
            );
        },
        save() {
            this.$emit('save', this.artefact);
        },
        undoModal() {
            (this.$refs.undoRef as any).show();
        },
        undo() {
            this.$emit('undo');
        },
        redo() {
            this.$emit('redo');
        },
        rename(art: Artefact) {
            this.$emit('rename');
        },
        openRename(art: Artefact) {
            this.chooseArtefact(art);
            this.$emit('inputRenameChanged', art);
        },
        deleteArtefact(art: Artefact) {
            // this.chooseArtefact(art);
            this.$emit('deleteArtefact', art);
        },
        chooseArtefact(art: Artefact) {
            this.$emit('artefactChanged', art);
        },
        async newArtefact() {
            this.newArtefactName = this.newArtefactName.trim();

            let newArtefact = {} as Artefact;
            this.waiting = true;
            this.errorMessage = '';
            try {
                newArtefact = await this.artefactService.createArtefact(
                    this.editionId,
                    this.imagedObject,
                    this.newArtefactName,
                    this.side as Side
                );
            } catch (err) {
                this.errorMessage = err;
            } finally {
                this.waiting = false;
            }

            this.newArtefactName = '';
            (this.$refs.newArtRef as any).hide();
            this.chooseArtefact(newArtefact);

            this.onDrawChanged('DRAW');
            this.$emit('create', newArtefact);
        },
        newModalShown() {
            // this.waiting = true;
            (this.$refs.newArtefactName as any).focus();
        },
        sideFilterChanged(filter: DropdownOption) {
            this.sideFilter = filter;
            this.$emit('onSideArtefactChanged', filter);
        }
    }
});
</script>

<style lang="scss" scoped>
ul.list {
    list-style: none;
}
span.selected {
    font-weight: bold;
}
section {
    margin-bottom: 20px;
}
#imaged-object-menu {
    touch-action: pan-y;
    top: 0;
    right: 0;
}
button.disable {
    cursor: not-allowed;
}
button {
    margin-right: 10px;
}
section.center-btn {
    text-align: center;
}
.btn-info {
    background-color: #6c757d;
    border-color: #6c757d;
}
#rename {
    margin-left: 20px;
    margin-right: -20px;
}
</style>
