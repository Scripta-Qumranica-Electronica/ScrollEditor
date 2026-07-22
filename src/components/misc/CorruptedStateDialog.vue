<template>
    <b-modal
        id="corrupted-state-dialog"
        v-model="isVisible"
        header-class="title-header"
        footer-class="title-footer"
    >
        <div>
            <label> We are facing some issues, please reload this page</label>
        </div>
        <template #footer>
            <div class="w-100">
                <b-button variant="outline-primary" @click="reloadPage()"
                    >Reload</b-button
                >
            </div>
        </template>
    </b-modal>
</template>
<script lang="ts">
import { Component, Prop, Vue, toNative } from 'vue-facing-decorator';

@Component({
    name: 'corrupted-state-dialog',
})
class CorruptedStateDialog extends Vue {
    public isVisible = false;

    public show() {
        this.isVisible = true;
    }

    public reloadPage() {
        this.isVisible = false;
        this.$router.go(0);
    }
}
export default toNative(CorruptedStateDialog);
</script>
