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

        <b-modal v-model="viewCommentVisible" id="viewCommentModal" title="Comment" hide-footer hide-header>
            <div id="comment-view" v-html="comment">
            </div>
        </b-modal>

        <b-modal v-model="editCommentVisible" id="editCommentModal" title="Comment" hide-footer hide-header>
            <div id="comment-edit">
                <ckeditor :editor="editor" v-model="comment" @input="onCommentUpdated" />
            </div>
        </b-modal>

    </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch, toNative } from 'vue-facing-decorator';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';

@Component({
    name: 'comment',
    components: {
    },
})
class CommentComponent extends Vue {
    // Follow the v-model pattern (Vue 3): modelValue prop + update:modelValue emit
    @Prop()
    public modelValue!: string;

    public comment: string = ''; // Use v-model to bind here, we can't use v-model to bind to the modelValue property
    public editor = ClassicEditor;
    public viewCommentVisible: boolean = false;
    public editCommentVisible: boolean = false;

    public get readOnly(): boolean {
        return this.$state.editions.current!.permission.readOnly;
    }

    public get commentDisplay() {
        if (!this.comment) {
            return 'None';
        }

        let shortened = this.comment.substring(0, 10);
        if (this.comment.length > 10) {
            shortened += '...';
        }
        return shortened;
    }

    public mounted() {
        this.comment = this.modelValue || '';
    }

    public onCommentUpdated() {
        this.$emit('update:modelValue', this.comment);
    }

    @Watch('modelValue')
    public onValueChanged() {
        this.comment = this.modelValue || '';
    }

    public onDeleteComment() {
        this.comment = '';
        this.onCommentUpdated();
    }

    public onViewComment() {
        this.viewCommentVisible = true;
    }

    public onEditComment() {
        this.editCommentVisible = true;
    }
}

export default toNative(CommentComponent);
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
