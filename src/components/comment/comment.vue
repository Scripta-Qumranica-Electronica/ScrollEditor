<template>
    <b-row>
        <b-col cols="3">
            <label for="comment">Comment</label>
        </b-col>
        <b-col cols="5">
            <span class="sm" @click="onViewComment()">{{ commentDisplay }}</span>
        </b-col>
        <b-col cols="4">
            <b-button @click="onViewComment()" title="View Comment" :disabled="!comment">
                <i class="fa fa-eye"/>
            </b-button>
            <b-button @click="onEditComment()" title="Edit Comment">
                <i class="fa fa-edit"/>
            </b-button>
            <b-button @click="onDeleteComment()" title="Delete Comment" :disabled="!comment">
                <i class="fa fa-trash"/>
            </b-button>
        </b-col>
        <b-modal ref="viewCommentModalRef" id="viewCommentModal" title="Comment" hide-footer hide-header>
            <div id="comment-view" v-html="comment">
            </div>
        </b-modal>
        <b-modal ref="editCommentModalRef" id="editCommentModal" title="Comment" hide-footer hide-header>
            <div id="comment-edit">
                <ckeditor :editor="editor" v-model="comment" @input="onCommentUpdated" />
            </div>
        </b-modal>
    </b-row>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch } from 'vue-property-decorator';

// tslint:disable-next-line
const ClassicEditor = require('@ckeditor/ckeditor5-build-classic');

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
    private editor = ClassicEditor;

    private get commentDisplay() {
        if (!this.comment) {
            return 'None';
        }

        let shortened = this.comment.substring(0, 10);
        if (this.comment.length > 10) {
            shortened += '...';
        }
        return shortened;
    }

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

    private onDeleteComment() {
        this.comment = '';
        this.onCommentUpdated();
    }

    private onViewComment() {
        (this.$refs.viewCommentModalRef as any).show();
        // this.$bvModal.show('viewCommentModal');
    }

    private onEditComment() {
        (this.$refs.editCommentModalRef as any).show();
        // this.$bvModal.show('editCommentModal');
    }
}
</script>

<style lang="scss" scoped>
#comment-view {
    min-height: 250px;
}

#comment-edit {
    min-height: 300px;

    #comment {
        display: block;
        box-sizing: border-box;
        height: 100%;
    }
}
</style>