<template>
    <b-row>
        <b-col cols="3" class="align-self-center">
            <label class="m-0" for="comment">Comment</label>
        </b-col>
        <b-col cols="5" class="comment-preview align-self-center">
            <p class="sm" v-html="comment" @click="onViewComment()"></p>
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

// We use require because with imports webpack complains a lot.
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

<style lang="scss">
#comment-view {
    max-height: 200px;
    overflow: auto;
}

.ck-editor__editable {
    max-height: 250px;
    overflow: auto;
}

.comment-preview {
    text-overflow: ellipsis;
    overflow: hidden;

    * {
        display: inline;
        padding-left: 3px;
    }
}
</style>