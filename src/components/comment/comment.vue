<template>
    <b-row>
        <b-col cols="3">
            <label for="comment">Comment</label>
        </b-col>
        <b-col cols="9">
            <b-form-input
                id="comment"
                class="inputsm"
                type="search"
                v-model="comment"
                @update="onCommentUpdated"
                placeholder="Comment"
            />
        </b-col>
    </b-row>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch } from 'vue-property-decorator';

@Component({
    name: 'comment',
    components: {
    },
})
export default class CommentComponent extends Vue {
    // Follow the v-model pattern as described here: https://www.digitalocean.com/community/tutorials/vuejs-add-v-model-support
    @Prop()
    public value!: string;

    private comment: string = ''; // Use v-model to bind here, we can't use v-model to bind to the value property

    private mounted() {
        this.comment = this.value || '';
    }

    private onCommentUpdated() {
        this.$emit('input', this.comment);
    }

    @Watch('value')
    private onValueChanged() {
        this.comment = this.value || '';
    }
}
</script>