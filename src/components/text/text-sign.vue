<template>
    <span>
        <span
            :class="[
                { selected: isSelected, highlighted: isHighlighted },
                cssStrings,
            ]"
            @click="onSignInterpretationClicked($event)"
            >{{ si.character || '&nbsp;' }}</span
        >
        <b-popover
            class="popover-body"
            :target="'popover-si-' + si.signInterpretationId"
            triggers="hover"
            container="my-container"
            ref="popover"
        >
            <div class="character-popover">
                <span :class="cssStrings">{{ si.character || '&nbsp;' }}</span>
                <ul>
                    <li>
                        <b-link @click="openEditSignModal($event)"
                            >Edit sign</b-link
                        >
                    </li>
                    <li>
                        <b-link @click="deleteSign(si)"
                            >Delete sign</b-link
                        >
                    </li>
                    <li><b-link>Add to left</b-link></li>
                    <li><b-link>Add to right</b-link></li>
                </ul>
            </div>
        </b-popover>
    </span>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import { SignInterpretation, Sign } from '@/models/text';
import EditSignModal from './edit-sign-modal.vue';

@Component({
    name: 'text-sign',
})
export default class SignComponent extends Vue {
    @Prop() public sign!: Sign;
    // @Prop() public selectedSignInterpretation!: SignInterpretation | null;

    // Each sign offers alternative readings. For now we always show the first suggestion
    private get si() {
        return this.sign.signInterpretations[0];
    }

    private get isSelected() {
        return this.$state.artefactEditor.isSiSelected(this.si);
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
    private deleteSign(si: SignInterpretation) {
        const index = si.sign.line.signs.findIndex((x) => x.indexInLine === si.sign.indexInLine);
        if (index > -1) {
            si.sign.line.signs.splice(index, 1);
        }
    }
    private onSignInterpretationClicked(event: MouseEvent) {
        if (event.ctrlKey || event.metaKey) {
            this.$state.artefactEditor.toggleSelectSign(this.si);
        } else {
            this.$state.artefactEditor.selectSign(this.si);
        }
    }

    public openEditSignModal(event: MouseEvent) {
        this.onSignInterpretationClicked(event);
        this.$root.$emit('bv::show::modal', 'editSignModal');
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
.is-reconstructed-true:after {
    content: '\05C4';
    /* Add a dot above the character */
}
.readability-incomplete-but-clear {
    /* readability-incomplete_but_clear */
    color: green;
}
.readability-incomplete-but-clear:after {
    content: '\05C4';
}
.readability-incomplete-and-not-clear:after {
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
}
</style>
