<template>
    <div>
        <b-modal lazy id="permissionModal" v-model="visible" hide-footer @show="shown">
           <div v-if="isAdmin">
            <form>
                <!-- editor invitation row -->
                <b-list-group class="mb-3">
                    <b-list-group-item>
                        <div class="row">
                            <b-form-input
                                v-model="invitationRow.email"
                                placeholder="Enter user email"
                                size="sm"
                                class="col-6"
                                @keydown="errorMessage = ''"
                                type="email"
                            ></b-form-input>
                            <b-form-select
                                size="sm"
                                class="col-3 ml-2"
                                id="inline-form-custom-select-pref"
                                v-model="invitationRow.permission"
                            >
                                <option value="read">Read</option>
                                <option value="write">Write</option>
                                <option value="admin">Admin</option>
                            </b-form-select>
                            <b-button
                                variant="primary"
                                size="sm"
                                class="flex-fill ml-2 btn-invite"
                                @click="invite"
                                :disabled="invitationRow.email === '' || !invitationRow.permission"
                            >
                                {{ $t('misc.invite') }}
                                <span v-if="waiting">
                                    <font-awesome-icon icon="spinner" spin></font-awesome-icon>
                                </span>
                            </b-button>
                        </div>
                        <div class="row">
                            <span class="col-12 text-danger">{{errorMessage}}</span>
                        </div>
                    </b-list-group-item>
                </b-list-group>
                <!-- shares rows -->
                <b-card class="mb-3" no-body header="Shares">
                    <b-list-group>
                        <b-list-group-item v-for="(share) in sharesRows" v-bind:key="share.email">
                            <div class="row">
                                <span class="col-6">{{share.email}}</span>
                                <b-form-select
                                    :disabled="share.disableRow || waiting"
                                    @change="setRowShareStatus(share)"
                                    size="sm"
                                    class="col-4"
                                    id="inline-form-custom-select-pref"
                                    v-model="share.permission"
                                >
                                    <option value="none">None</option>
                                    <option value="read">Read</option>
                                    <option value="write">Write</option>
                                    <option value="admin">Admin</option>
                                </b-form-select>

                                <b-button
                                    size="sm"
                                    class="ml-2"
                                    variant="success"
                                    @click="update(share)"
                                    :disabled="share.disableButton || share.disableRow|| waiting"
                                >{{share.buttonText}}</b-button>
                            </div>
                        </b-list-group-item>
                    </b-list-group>
                </b-card>
                <!-- invitations rows -->
                <b-card no-body header="Invitations">
                    <b-list-group flush id="invitations-list">
                        <b-list-group-item
                            v-for="invit in invitationsRows"
                            v-bind:key="invit.email">
                            <div class="row">
                                <span class="col-6">{{invit.email}}</span>
                                <b-form-select
                                    :disabled="invit.disableRow || invit.disableButton || waiting"
                                    @change="setRowInvitStatus(invit)"
                                    size="sm"
                                    class="col-4"
                                    id="inline-form-custom-select-pref"
                                    v-model="invit.permission"
                                >
                                    <option value="none">None</option>
                                    <option value="read">Read</option>
                                    <option value="write">Write</option>
                                    <option value="admin">Admin</option>
                                </b-form-select>

                                <b-button
                                    size="sm"
                                    class="ml-2"
                                    variant="success"
                                    @click="update(invit)"
                                    :disabled="invit.disableButton || waiting"
                                >{{invit.buttonText}}</b-button>
                            </div>
                        </b-list-group-item>
                    </b-list-group>
                </b-card>
            </form>
           </div>
           <div v-if="!isAdmin" class="text-danger">Ad</div>
        </b-modal>
    </div>
</template>

<script lang="ts">
import { Component, Vue, Watch, toNative } from 'vue-facing-decorator';
import { registerModalListener } from '@/utils/modal-bus';
import { EditionInfo, ShareInfo, SimplifiedPermission } from '@/models/edition';
import EditionService from '@/services/edition';

interface ShareRow {
    email: string;
    type: 'invitation' | 'share';
    oldPermission: SimplifiedPermission;
    permission: SimplifiedPermission;
    buttonText?: string;
    disableButton: boolean;
    disableRow: boolean;
}
@Component({
    name: 'permission-modal',
    components: {}
})
class PermissionModal extends Vue {
    public invitationRow: ShareRow = { permission: 'read' } as ShareRow;
    public editionService: EditionService = new EditionService();
    public visible: boolean = false;

    // public errorService:ErrorService= new ErrorService(this)
    public sharesRows: ShareRow[] = [];
    public invitationsRows: ShareRow[] = [];
    public waiting = false;
    public errorMessage = '';
    private disposeModalListener?: () => void;

    public mounted() {
        this.disposeModalListener = registerModalListener(
            'permissionModal',
            () => { this.visible = true; },
            () => { this.visible = false; },
        );
    }

    public beforeUnmount() {
        this.disposeModalListener?.();
    }

    public show() {
        this.visible = true;
    }

    public async shown() {
        await this.editionService.stateManager.prepare.invitations(this.current.id);

        this.fillShareRows(this.current!.shares);
        this.fillInvitationRows(this.current!.invitations);
    }

    public get current(): EditionInfo {
        return this.$state.editions.current!;
    }

    public get isAdmin(): boolean {
        return this.current.permission.isAdmin;
    }

    public async update(share: ShareRow) {
        let msg = '';
        if (share.type === 'invitation') {
            await this.editionService.updateInvitation(
                this.current!.id,
                share.email,
                share.permission
            );
            msg = 'toasts.invitationSent';
        } else if (share.type === 'share') {
            await this.editionService.updateSharePermissions(this.current!.id, share.email, share.permission);
            msg = 'toasts.permissionsUpdated';
        }

        this.$toasted.show(this.$t(msg, {email: share.email}), {
            type: 'info',
            position: 'top-right',
            duration: 5000,
        });
    }
    public async invite() {
        try {
            this.waiting = true;
            await this.editionService.inviteEditor(
                this.current!.id,
                this.invitationRow.email,
                this.invitationRow.permission
            );
        } catch (e) {
            // this.errorMessage = this.errorService.getErrorMessage(e);
            this.errorMessage = 'An error occured';
        } finally {
            this.waiting = false;
            this.invitationRow.email = '';
            this.invitationRow.permission = 'read';
        }
    }

    public setRowShareStatus(row: ShareRow) {
        if (row.email === this.$state.session.user!.email) {
            row.disableRow = true;
            return;
        }
        row.disableRow = false;
        if (row.permission !== row.oldPermission) {
            row.buttonText = 'Update';
            row.disableButton = false;
        } else {
            row.disableButton = true;
        }
        if (row.permission === 'none') {
            row.buttonText = 'Revoke';
        }
    }

    public setRowInvitStatus(row: ShareRow) {
        row.disableRow = false;
        if (row.permission !== row.oldPermission) {
            row.buttonText = 'Update';
        } else {
            row.buttonText = 'Resend';
        }
        if (row.permission === 'none') {
            row.buttonText = 'Revoke';
        }
    }

    public get invitationList() {
        return this.current.invitations;
    }

    @Watch('invitationList')
    public onInvitationsChange(newInvitations: ShareInfo[]) {
        this.fillInvitationRows(newInvitations);
    }

    public get shareList() {
        return this.current.shares;
    }

    @Watch('shareList')
    public onSharesChange(newShares: ShareInfo[]) {
        this.fillShareRows(newShares);
    }

    public fillInvitationRows(invitations: ShareInfo[]) {
        this.invitationsRows = this.current!.invitations.map(x => ({
            email: x.email,
            oldPermission: x.simplified,
            permission: x.simplified,
            buttonText: 'Resend',
            type: 'invitation',
            disableRow: false,
            disableButton: false,
        }));

        for (const row of this.invitationsRows) {
            this.setRowInvitStatus(row);
        }
    }

    public fillShareRows(shares: ShareInfo[]) {
        this.sharesRows = this.current!.shares.map(x => ({
            email: x.email,
            oldPermission: x.simplified,
            permission: x.simplified,
            buttonText: 'Update',
            disableRow: false,
            disableButton: false,
            type: 'share',
        }));

        for (const row of this.sharesRows) {
            this.setRowShareStatus(row);
        }
    }
}
export default toNative(PermissionModal);
</script>


<style lang="scss" scoped>
.flex-container {
    display: flex;
    flex-direction: row;
    /* flex-wrap: wrap; */
    justify-content: space-between;
}
</style>
