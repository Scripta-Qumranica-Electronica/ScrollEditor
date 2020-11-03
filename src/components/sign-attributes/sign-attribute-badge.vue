<template>
    <div class="sign-attribute">
        <span :class="{ highlighted: isHighlighted }">
            <b-badge variant="secondary"
                >{{ attribute.attributeString }}:
                {{ attribute.attributeValueString }}</b-badge
            >
        </span>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import { InterpretationAttributeDTO } from '@/dtos/sqe-dtos';

@Component({
    name: 'sign-attribute-badge',
})
export default class SignAttributeBadge extends Vue {
    @Prop()
    public attribute!: InterpretationAttributeDTO;

    public get artefactEditorState() {
        return this.$state.artefactEditor;
    }

    public get isHighlighted(): boolean {
        return (
            this.artefactEditorState.highlightCommentMode &&
            this.attribute &&
            !!this.attribute.commentary
        );
    }
}
</script>

<style lang="scss" scoped>
@import '@/assets/styles/_variables.scss';
@import '@/assets/styles/_fonts.scss';
.sign-attribute {
    cursor: default;
    display: inline;
}

span.highlighted span.badge {
    color: $yellow-select !important;
}
</style>
