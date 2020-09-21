<template>
    <div class="sign-attribute">
        <span v-if="isBoolean">
            <b-badge variant="secondary">{{attribute.attributeString}}</b-badge>
        </span>
        <span v-else>
            <b-badge variant="secondary">{{attribute.attributeString}}: {{attribute.attributeValueString}}</b-badge>
        </span>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import { Artefact } from '@/models/artefact';
import {
    TextFragmentData,
    TextFragment,
    SignInterpretation,
    ArtefactTextFragmentData,
} from '@/models/text';
import { EditionInfo } from '@/models/edition';
import { InterpretationAttributeDTO } from '@/dtos/sqe-dtos';

@Component({
    name: 'sign-attribute-badge',
})
export default class SignAttributeBadge extends Vue {
    @Prop()
    public attribute!: InterpretationAttributeDTO;

    private get isBoolean(): boolean {
        return this.attribute!.attributeValueString === 'TRUE';
    }
}
</script>

<style lang="scss" scoped>
.sign-attribute {
    cursor: default;
}
</style>
