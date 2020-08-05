<template>
    <div class="attributes">
        <ul class="row">
            <li class="pr-2"
                v-for="attribute in selectedSignInterpretation.attributes"
                :key="attribute.interpretationAttributeId"
            >
                <b-badge variant="secondary">{{attribute.attributeValueString}}</b-badge>
            </li>
        </ul>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Emit } from 'vue-property-decorator';
import { Artefact } from '@/models/artefact';
import {
    TextFragmentData,
    TextFragment,
    SignInterpretation,
    ArtefactTextFragmentData,
} from '@/models/text';
import TextFragmentComponent from '@/components/text/text-fragment.vue';
import { EditionInfo } from '@/models/edition';

@Component({
    name: 'si-attributes',
})
export default class SiAttributes extends Vue {
    @Prop() public selectedSignInterpretation!: SignInterpretation | null;
}
</script>

<style lang="scss" scoped>
.attributes {
    height: 10%;
    border-top: 3px solid #6c757d;
    padding: 10px;
    ul {
        list-style: none;

        li{

        }
    }
}
</style>
