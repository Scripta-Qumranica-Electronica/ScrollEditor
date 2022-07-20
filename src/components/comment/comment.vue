<template>
    <div id="comment-area">
        <p v-if="comment" v-html="comment" @click="onViewComment" class="comment"/>
        <p v-else class="no comment">No Comment</p>
        <div class="buttons">
            <b-button @click="onViewComment()"
                    title="View Comment" :disabled="!comment" size="sm">
                <i class="fa fa-eye"/>
            </b-button>
            <b-button @click="onEditComment()"
                    title="Edit Comment" :disabled="readOnly" size="sm">
                <i class="fa fa-edit"/>
            </b-button>
            <b-button @click="onDeleteComment()"
                    title="Delete Comment" :disabled="!comment || readOnly" size="sm">
                <i class="fa fa-trash larger-btn"/>
            </b-button>
        </div>

        <b-modal ref="viewCommentModalRef" id="viewCommentModal" title="Comment" hide-footer hide-header>
            <div id="comment-view" v-html="comment">
            </div>
        </b-modal>

        <b-modal ref="editCommentModalRef" id="editCommentModal" title="Comment" hide-footer hide-header>
            <div id="comment-edit">
                <ckeditor :editor="editor" v-model="comment" @input="onCommentUpdated" />
            </div>
        </b-modal>

    </div>
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

    private get readOnly(): boolean {
        return this.$state.editions.current!.permission.readOnly;
    }

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
#comment-area {
    margin: 8px;
    display: flex;
}

.ck-editor__editable {
    max-height: 250px;
    overflow: auto;
}

.comment {
    text-overflow: ellipsis;
    overflow: hidden;
    flex-grow: 1;

    &.no {
        color: lightgray;
    }
}

</style>