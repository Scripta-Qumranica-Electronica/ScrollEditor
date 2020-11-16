<template>
    <b-modal
        id="corrupted-state-dialog"
         ref="corruptedModalRef"
        header-class="title-header"
        footer-class="title-footer"
    >
        <div>
            <label> We are facing some issues, please reload this page</label>
        </div>
        <template v-slot:modal-footer>
            <div class="w-100">
                <b-button variant="outline-primary" @click="reloadPage()"
                    >Reload</b-button
                >
            </div>
        </template>
    </b-modal>
</template>
<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';

@Component({
    name: 'corrupted-state-dialog',
})
export default class CorruptedStateDialog extends Vue {
    public reloadPage() {
        this.$router.go(0);
        (this.$refs.corruptedModalRef as any).hide()
    }
}
</script>