<template>
    <b-modal id="attribute-modal" hide-header @hide="onHide">
        <div v-if="attribute">
            <b-row>
                <b-col cols="2" />
                <b-col cols="7">
                    <b-badge variant="secondary">{{attribute.attributeValueString}}</b-badge>
                    <span class="description">{{attribute.description}}</span>
                </b-col>
                <b-col cols="3">
                    <b-button :disabled="!deleteAllowed" click="onDeleteAttribute">
                        <i class="fa fa-trash"></i>
                    </b-button>
                </b-col>
            </b-row>
            <b-row>
                <b-col cols="2" text-right>Comment:</b-col>
                <b-col cols="7">
                    <b-form-input type="search" v-model="attribute.commentary" @update="onCommentUpdated" placeholder="Comment" />
                </b-col>
                <b-col cols="3" />
            </b-row>
        </div>

        <!-- <template v-slot:modal-footer>
            <b-button size="sm" @click="onSave">Save</b-button>
        </template> -->
    </b-modal>
</template>

<script lang="ts">
import { AttributeValueDTO, InterpretationAttributeDTO } from '@/dtos/sqe-dtos';
import { BvModalEvent } from 'bootstrap-vue';
import { Component, Prop, Vue, Emit, Watch } from 'vue-property-decorator';
// import ErrorService from '@/services/error';

@Component({
    name: 'attribute-modal',
    components: {},
})
export default class AttributeModal extends Vue {
    private comment: string = '';

    private mounted() {
        this.setComment(this.attribute);
    }
    private get attribute() {
        return this.$state.artefactEditor.selectedAttribute;
    }

    private get deleteAllowed() {
        return true;
    }

    @Watch('attribute')
    private onAttributeChanged(
        newAttribute: InterpretationAttributeDTO | null
    ) {
        this.setComment(newAttribute);
    }

    private setComment(newAttribute: InterpretationAttributeDTO | null) {
        this.comment = newAttribute?.commentary?.commentary || '';
    }

    private onCommentUpdated() {
        console.debug('Comment changed to ', this.comment);
    }

    private onDeleteAttribute() {
        console.debug('Attribute deleted');
    }

    private onHide() {
        this.$state.artefactEditor.selectedAttribute = null;
    }
}
</script>


<style lang="scss" scoped>
.flex-container {
    display: flex;
    flex-direction: row;
    /* flex-wrap: wrap; */
    justify-content: space-between;
}
</style>
