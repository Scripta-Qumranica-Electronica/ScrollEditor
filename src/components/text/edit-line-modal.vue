<template>
    <div>
        <b-modal
            id="editLineModal"
            title="Edit Line" 
            hide-footer
            @shown="shown"
            ref="my-line-modal"
        >
            <text-line
                :line="line"
                direction="rtl"
                class="d-flex w-100"
                :ref="'line-' + (line && line.lineId)"
                :isEditMode="true"
            ></text-line>
        </b-modal>
    </div>
</template>

<script lang="ts">
import { Line, SignInterpretation } from '@/models/text';
import { Component, Prop, Vue, Watch } from 'vue-property-decorator';
import TextLine from '@/components/text/text-line.vue';

@Component({
    name: 'edit-line-modal',
    components: {
        'text-line': TextLine,
    },
})
export default class EditLineModal extends Vue {
    public get editorState() {
        return this.$state.textFragmentEditor;
    }

    public get selectedSignInterpretation(): SignInterpretation {
        return this.editorState.selectedSignInterpretations[0];
    }

    public get line(): Line {
        return (
            this.selectedSignInterpretation &&
            this.selectedSignInterpretation.sign.line
        );
    }

    public shown(): void {
        // this.isEditMode = true;
        this.$nextTick(() => {
            const lineVue = this.$refs['line-' + this.line.lineId] as any;
            const lineA = (lineVue && lineVue.$el) as HTMLElement;
            const line = lineA.querySelector('.line-container') as HTMLElement;
            if (line) {
                // set initial cursor position on first letter of line
                const range = document.createRange();
                const sel = document.getSelection();
                range.setStart(line.childNodes[1], 0);
                range.collapse(true);

                sel?.removeAllRanges();
                sel?.addRange(range);
                line.focus();
            }
        });
    }
}
</script>

<style lang="scss" scoped>
.w-input {
    width: 100px;
    font-weight: 700;
    font-size: 18px;
}
</style>
