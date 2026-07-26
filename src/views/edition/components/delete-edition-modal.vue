<template>
    <b-modal lazy
        v-if="currentEdition"
        v-model="visible"
        id="deleteEditionModal"
        :title="'Delete edition: ' + currentEdition.name"
        header-class="header"
        footer-class="footer"
    >
        <div class="modal-body">
            <p>Are you sure you want to delete edition?</p>
            <div>
                <label for="input-confirmation"
                    >Type 'delete' to delete the edition</label
                >
                <b-row no-gutters>
                    <b-form-input
                        size="sm"
                        class="col-6"
                        id="input-confirmation"
                        v-model="confirmation"
                        trim
                    ></b-form-input>
                </b-row>
            </div>
        </div>
        <template #footer>
            <div class="w-100">
                <div>
                    <b-button
                        size="sm"
                        class="btn btn-primary me-2"
                        :disabled="confirmation !== 'delete'"
                        @click="deleteEdition"
                    >
                        Delete
                    </b-button>
                </div>
            </div>
        </template>
    </b-modal>
</template>

<script lang="ts">
import { Component, Vue, toNative } from 'vue-facing-decorator';
import { registerModalListener } from '@/utils/modal-bus';
import Waiting from '@/components/misc/Waiting.vue';
import { boolean, re } from 'mathjs';
import EditionService from '@/services/edition';
import { DetailedUserDTO } from '@/dtos/sqe-dtos';
@Component({
    name: 'delete-edtion-modal',
    components: {
        Waiting,
    },
})
class DeleteEditionModal extends Vue {
    public confirmation: string = '';
    public deleting: boolean = false;
    public visible: boolean = false;
    public editionService = new EditionService();
    private disposeModalListener?: () => void;

    public mounted() {
        this.disposeModalListener = registerModalListener(
            'deleteEditionModal',
            () => { this.visible = true; },
            () => { this.visible = false; },
        );
    }

    public beforeUnmount() {
        this.disposeModalListener?.();
    }

    public get currentEdition() {
        return this.$state.editions.current!;
    }

    public get currentUser(): DetailedUserDTO {
        return this.$state.session.user!;
    }

    public show() {
        this.visible = true;
    }

    public async delete(adminDelete?: boolean) {
        this.deleting = true;
        try {
            await this.editionService.deleteEdition(
                this.currentEdition!.id,
                adminDelete
            );
            this.$state.editions.remove(this.currentEdition!.id);
            this.$router.push('/home');
            this.showMessage('toasts.editionDeleteSuccess', 'success');
        } catch (err) {
            this.showMessage('toasts.editionDeleteError', 'error');
        } finally {
            this.deleting = false;
            this.visible = false;
        }
    }

    public async deleteEdition() {
        if (!this.currentEdition) {
            throw new Error("Can't delete if there is no edition");
        }
        const isAdmin = this.currentEdition.permission.isAdmin;

        const editors = this.currentEdition.shares.filter(
            (x) => x.email !== this.currentUser.email && x.permissions.mayWrite
        );

        if (!isAdmin) {
            this.delete();
        } else if (isAdmin && editors.length) {
            const confirm = window.confirm(
                'Are you sure you wish to delete the edition for all users ?'
            );
            if (confirm) {
                this.delete(true);
            } else {
                // give first editor admin right ?
                await this.editionService.updateSharePermissions(
                    this.currentEdition!.id,
                    editors[0].email,
                    'admin'
                );
                // remove himself from admin
                await this.editionService.updateSharePermissions(
                    this.currentEdition!.id,
                    this.currentUser.email,
                    'write'
                );
                this.delete();
            }
        } else if (isAdmin && !editors.length) {
            this.delete(true);
        }
    }

    public showMessage(msg: string, type: string = 'info') {
        this.$toasted.show(this.$tc(msg), {
            type,
            position: 'top-right',
            duration: 7000,
        });
    }
}
export default toNative(DeleteEditionModal);
</script>
<style lang="scss" scoped>
</style>
