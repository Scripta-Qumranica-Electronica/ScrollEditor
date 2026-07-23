<template>
    <span contenteditable=true>
        <span
            class="text-sign"
            :class="[
                { selected: isSelected,notSelected:!isSelected, highlighted: isHighlighted },
                cssStrings,
            ]"
            @click="onSignInterpretationClicked($event)"
            @contextmenu="
                openSignMenu($event, 'popover-si-' + si.signInterpretationId)
            "
            v-html="si.htmlCharacter"
        />
        <!-- <b-popover
            v-if="withMenu && !readOnly"
            custom-class="popover-sign-body"
            :target="'popover-si-' + si.signInterpretationId"
            triggers="blur"
            @shown="focusPopover($event)"
        >
            <div
                class="character-popover"
                tabindex="-1"
                ref="signMenu"
                @blur="closeSignMenu($event)"
            >
                <ul>
                    <li>
                        <p @click="openEditSignModal()">
                            {{ $t('misc.editSign') }}
                        </p>
                    </li>
                    <li>
                        <p @click="deleteSignInterpretation(si)">
                            {{ $t('misc.deleteSign') }}
                        </p>
                    </li>
                    <li>
                        <p @click="openEditLineModal()">{{ $t('misc.editLine') }}</p>
                    </li>
                    <li v-if="editingMode === 'artefact'">
                        <p @click="openAddLeftSignModal()">
                            {{ $t('misc.addToLeft') }}
                        </p>
                    </li>
                    <li v-if="editingMode === 'artefact'">
                        <p @click="openAddRightSignModal()">
                            {{ $t('misc.addToRight') }}
                        </p>
                    </li>
                    <li v-if="editingMode === 'manuscript' && virtualArtefact">
                        <p @click="openEditVirtualArtefact()">
                            Edit Reconstructed Text
                        </p>
                    </li>
                    <li v-if="qwbWordId !== undefined">
                        <p @click="openQwbVariantsModal()">
                            {{ $t('misc.showQwbVariants') }}
                        </p>
                    </li>
                </ul>
            </div>
        </b-popover> -->

        <b-modal lazy
            v-model="showQwbVariantsModal"
            hide-footer
            title="Variant Readings from QD"
        >
            <div
                v-if="qwbVariants === null || (qwbVariants.variants?.length ?? 0) === 0"
            >
                <p>No variants found in the QD database.</p>
            </div>
            <div v-else>
                <div v-for="variant in qwbVariants.variants">
                    <b>{{ variant.variantReading }}</b>
                    <hr />
                    <div v-for="biblio in variant.bibliography">
                        <p>
                            {{ biblio.shortTitle }}, {{ biblio.pageReference }}
                        </p>
                        <p v-if="biblio.comment !== undefined">
                            {{ biblio.comment }}
                        </p>
                    </div>
                </div>
            </div>
            <b-button
                block
                @click="showQwbVariantsModal = false"
                >Close</b-button
            >
        </b-modal>
    </span>
</template>

<script lang="ts">
import { Component, Prop, Emit, Vue, toNative } from 'vue-facing-decorator';
import { SignInterpretation, Sign, Line } from '@/models/text';
import QwbProxyService from '@/services/qwb-proxy';
import EditSignModal from './edit-sign-modal.vue';
import { OperationsManager, SavingAgent } from '@/utils/operations-manager';
import {
    ArtefactROIOperation,
    DeleteSignInterpretationOperation,
} from '../../views/artefact-editor/operations';
import { Artefact } from '@/models/artefact';
import { QwbWordVariantListDTO } from '@/dtos/sqe-dtos';
import { showModal } from '@/utils/modal-bus';

@Component({
    name: 'text-sign',
})
class TextSign extends Vue {
    @Prop() public sign!: Sign;
    @Prop() public withMenu!: boolean;
    public previousMenuId: string = '';
    public qwbVariants: QwbWordVariantListDTO | null = null;
    public contenteditable: boolean = false;
    public showQwbVariantsModal: boolean = false;

    public get readOnly(): boolean {
        return this.$state.editions.current!.permission.readOnly;
    }

    public get editingMode() {
        return this.$state.textFragmentEditor.textEditingMode;
    }

    // Each sign offers alternative readings. For now we always show the first suggestion
    public get si() {
        return this.sign.signInterpretations[0];
    }

    public get isSelected() {
        return this.$state.textFragmentEditor.isSiSelected(this.si);
    }

    public get isHighlighted() {
        return (
            this.$state.artefactEditor.highlightCommentMode &&
            (this.si.commentary ||
                this.si.attributes.some((attr) => attr.commentary))
        );
    }

    public get cssStrings(): string {
        return this.si.attributes
            .map((x) =>
                `${x.attributeString}-${x.attributeValueString}`
                    .toLowerCase()
                    .replace('_', '-')
            )
            .join(' ');
    }

    public get virtualArtefact(): Artefact | null {
        if (this.si.rois.length !== 1) {
            return null;
        }

        const artefact = this.$state.artefacts.find(this.si.rois[0].artefactId);
        if (!artefact) {
            return null;
        }

        return artefact.isVirtual ? artefact : null;
    }

    public get qwbWordId(): number | undefined {
        const allQwbWordIds = this.sign.signInterpretations.flatMap(
            (x) => x.qwbWordIds
        );
        return allQwbWordIds.length > 0 ? allQwbWordIds[0] : undefined;
    }
    public get textFragmentEditorState() {
        return this.$state.textFragmentEditor;
    }

    public deleteSignInterpretation(si: SignInterpretation) {
        const delOps = this.si.rois.map(
            (roi) => new ArtefactROIOperation('erase', roi)
        );
        const op = new DeleteSignInterpretationOperation(this.si.id);

        op.redo(true); // First delete the sign, which uses the ROIs to update the artefacts SI caches
        for (const delOp of delOps) {
            // Now delete the ROIs
            delOp.redo(true);
        }
        this.$state.eventBus.emit('new-bulk-operations', [...delOps, op]);
    }

    public onSignInterpretationClicked(event: MouseEvent) {
        if (event.ctrlKey || event.metaKey) {
            this.$state.textFragmentEditor.toggleSelectSign(this.si);
        } else {
            this.$state.textFragmentEditor.selectSign(this.si);
        }
    }

    // @Emit()
    // private editLine() {
    //     return true;
    // }
    // private openEditLineModal() {
    //     this.$root.$emit('bv::show::modal', 'editLineModal');
    // }

    public openEditSignModal() {
        this.$state.textFragmentEditor.modeSignModal = 'edit';
        showModal('editSignModal');
    }

    public openAddLeftSignModal() {
        this.$state.textFragmentEditor.modeSignModal = 'create';
        showModal('editSignModal');
    }

    public openAddRightSignModal() {
        this.$state.textFragmentEditor.modeSignModal = 'create';
        const si =
            this.si.sign.line.signs[this.si.sign.indexInLine - 1]
                .signInterpretations[0];
        this.$state.textFragmentEditor.selectSign(si);
        showModal('editSignModal');
    }

    public async openQwbVariantsModal() {
        if (this.qwbWordId !== undefined) {
            if (this.qwbVariants === null && this.qwbWordId !== undefined) {
                const qps = new QwbProxyService();
                this.qwbVariants = await qps.getQwbWordVariants(this.qwbWordId);
            }
            this.showQwbVariantsModal = true;
        }
    }

    public openSignMenu(event: MouseEvent, signMenuId: string) {
        // prevent usual menu to display
        event.preventDefault();
        this.$state.textFragmentEditor.selectSign(this.si);

        // TODO(vue3): replace bv::show::popover bus event — use a per-instance boolean to control b-popover visibility
        this.$root!.$emit('bv::show::popover', signMenuId);
        this.previousMenuId = signMenuId;
    }

    public openEditVirtualArtefact() {
        if (!this.virtualArtefact) {
            console.warn(
                "Can't edit virtual artefact when no virtual artefact is set"
            );
            return;
        }
        this.$state.textFragmentEditor.editedVirtualArtefact =
            this.virtualArtefact;

        this.$state.showEditReconTextBar = true;
        // this.showReconTextEditor();
        // this.$emit('showReconTextEditor');

        // this.$root.$emit('bv::show::modal', 'editVirtualArtefactText');
    }

    @Emit()
    public showReconTextEditor() {
        return true;
    }

    public closeSignMenu() {
        // TODO(vue3): replace bv::hide::popover bus event — use a per-instance boolean to control b-popover visibility
        this.$root!.$emit('bv::hide::popover', this.previousMenuId);
    }

    public focusPopover() {
        (this.$refs.signMenu as any).focus();
    }
}
export default toNative(TextSign);
</script>
<style lang="scss" scoped>
@import '@/assets/styles/_variables.scss';
@import '@/assets/styles/_fonts.scss';

div {
    display: inline;
}

span {
    color: $black;
    cursor: default;
}
span.notSelected{
    cursor: auto;
}

span.selected {
    color: $red;
    font-weight: bold;
    text-shadow: 0 0 2px $black;
    transition: 0.6s;
    // font-size: 17px;
    margin: 1px;
}

span.highlighted {
    background-color: $yellow-select;
}

.is-reconstructed-true {
    /* is_reconstructed-true */
    color: #bcbec0;
    // user-select: none;
}
.text-sign::after {
    content: none;
}
.readability-incomplete-but-clear {
    /* readability-incomplete_but_clear */
    color: green;
}
.text-sign.readability-incomplete-but-clear:after {
    content: '\05C4';
}
.text-sign.readability-incomplete-and-not-clear:after {
    content: '\05AF';
}
.readability-incomplete-and-not-clear {
    color: blue;
}
.relative-position-above-line {
    vertical-align: super;
    font-size: 80%;
}
.relative-position-below-line {
    vertical-align: sub;
    font-size: 80%;
}

.character-popover {
    .sign-type-space:after {
        content: '˽';
    }
    ul {
        cursor: pointer;
        list-style-type: none;
        padding-left: 0px;

        &:focus,
        &:focus-visible {
            outline: unset;
        }
        li p {
            margin-bottom: 8px;
        }
        li p:hover {
            color: $blue;
        }
    }
    &:focus,
    &:focus-visible {
        outline: unset;
    }
}
</style>
<style lang="scss" scoped>
.popover-sign-body .popover-body {
    margin: 0;
}
</style>
