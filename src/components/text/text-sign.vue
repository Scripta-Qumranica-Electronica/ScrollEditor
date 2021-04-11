<template>
    <span>
        <span
            class="text-sign"
            :class="[
                { selected: isSelected, highlighted: isHighlighted },
                cssStrings,
            ]"
            @click="onSignInterpretationClicked($event)"
            @contextmenu="openSignMenu($event, 'popover-si-' + si.signInterpretationId)"
            v-html="si.htmlCharacter" />
        <b-popover
            v-if="withMenu && !readOnly"
            custom-class="popover-sign-body"
            :target="'popover-si-' + si.signInterpretationId"
            triggers=""
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
                        <p @click="openEditSignModal()">{{ $t('misc.editSign') }}</p>
                    </li>
                    <li>
                        <p @click="deleteSignInterpretation(si)"
                            >{{ $t('misc.deleteSign') }}</p
                        >
                    </li>
                    <li v-if="editingMode==='artefact'">
                        <p @click="openAddLeftSignModal()"
                            >{{ $t('misc.addToLeft') }}</p
                        >
                    </li>
                    <li v-if="editingMode==='artefact'">
                        <p @click="openAddRightSignModal()"
                            >{{ $t('misc.addToRight') }}</p
                        >
                    </li>
                </ul>
            </div>
        </b-popover>
    </span>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import { SignInterpretation, Sign } from '@/models/text';
import EditSignModal from './edit-sign-modal.vue';
import { OperationsManager, SavingAgent } from '@/utils/operations-manager';
import {
    ArtefactROIOperation,
    DeleteSignInterpretationOperation,
} from '../../views/artefact-editor/operations';

@Component({
    name: 'text-sign',
})
export default class TextSign extends Vue {
    @Prop() public sign!: Sign;
    @Prop() public withMenu!: boolean;
    private previousMenuId: string = '';

    private get readOnly(): boolean {
        return this.$state.editions.current!.permission.readOnly;
    }

    private get editingMode() {
        return this.$state.textFragmentEditor.textEditingMode;
    }

    // Each sign offers alternative readings. For now we always show the first suggestion
    private get si() {
        return this.sign.signInterpretations[0];
    }

    private get isSelected() {
        return this.$state.textFragmentEditor.isSiSelected(this.si);
    }

    private get isHighlighted() {
        return (
            this.$state.artefactEditor.highlightCommentMode &&
            (this.si.commentary ||
                this.si.attributes.some((attr) => attr.commentary))
        );
    }

    private get cssStrings(): string {
        return this.si.attributes
            .map((x) =>
                `${x.attributeString}-${x.attributeValueString}`
                    .toLowerCase()
                    .replace('_', '-')
            )
            .join(' ');
    }

    private deleteSignInterpretation(si: SignInterpretation) {
        const delOps = this.si.rois.map(
            (roi) => new ArtefactROIOperation('erase', roi)
        );
        const op = new DeleteSignInterpretationOperation(this.si.id);

        op.redo(true);   // First delete the sign, which uses the ROIs to update the artefacts SI caches
        for (const delOp of delOps) {  // Now delete the ROIs
            delOp.redo(true);
        }
        this.$state.eventBus.emit('new-bulk-operations', [...delOps, op]);
    }

    private onSignInterpretationClicked(event: MouseEvent) {
        if (event.ctrlKey || event.metaKey) {
            this.$state.textFragmentEditor.toggleSelectSign(this.si);
        } else {
            this.$state.textFragmentEditor.selectSign(this.si);
        }
    }

    private openEditSignModal() {
        this.$state.textFragmentEditor.modeSignModal = 'edit';
        this.$root.$emit('bv::show::modal', 'editSignModal');
    }

    private openAddLeftSignModal() {
        this.$state.textFragmentEditor.modeSignModal = 'create';
        this.$root.$emit('bv::show::modal', 'editSignModal');
    }

    private openAddRightSignModal() {
        this.$state.textFragmentEditor.modeSignModal = 'create';
        const si = this.si.sign.line.signs[this.si.sign.indexInLine - 1]
            .signInterpretations[0];
        this.$state.textFragmentEditor.selectSign(si);
        this.$root.$emit('bv::show::modal', 'editSignModal');
    }

    private openSignMenu(event: MouseEvent, signMenuId: string) {
        // prevent usual menu to display
        event.preventDefault();
        this.$state.textFragmentEditor.selectSign(this.si);

        this.$root.$emit('bv::show::popover', signMenuId);
        this.previousMenuId = signMenuId;
    }

    private closeSignMenu() {
         this.$root.$emit('bv::hide::popover', this.previousMenuId);
    }

    private focusPopover() {
        (this.$refs.signMenu as any).focus();
    }
}
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

span.selected {
    color: $red;
    font-weight: bold;
    text-shadow: 0 0 2px $black;
    transition: 0.6s;
    font-size: 17px;
    margin: 1px;
}

span.highlighted {
    background-color: $yellow-select;
}

.is-reconstructed-true {
    /* is_reconstructed-true */
    color: #bcbec0;
    user-select: none;
}
.text-sign::after {
    content: none;
}
.text-sign.is-reconstructed-true::after {
    content: '\05C4';
    /* Add a dot above the character */
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
        li p:hover{
            color:$blue;
        }
    }
    &:focus,
    &:focus-visible {
        outline: unset;
    }
}


</style>
<style lang="scss">
.popover-sign-body .popover-body {
    margin: 0;
}
</style>
