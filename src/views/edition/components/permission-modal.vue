<template>
    <div>
        <b-modal id="permissionModal" hide-footer @shown="shown">
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
           <div v-if="!isAdmin" class="text-danger">{{$t(home.admin)}}</div>
        </b-modal>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Emit, Watch } from 'vue-property-decorator';
import { EditionInfo, ShareInfo, SimplifiedPermission } from '@/models/edition';
import EditionService from '@/services/edition';
import { ImagedObject } from '@/models/imaged-object';
import { BvModalEvent } from 'bootstrap-vue';
// import ErrorService from '@/services/error';

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
export default class PermissionModal extends Vue {
    public invitationRow: ShareRow = { permission: 'read' } as ShareRow;
    public editionService: EditionService = new EditionService();

    // public errorService:ErrorService= new ErrorService(this)
    public sharesRows: ShareRow[] = [];
    public invitationsRows: ShareRow[] = [];
    private waiting = false;
    private errorMessage = '';

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

        this.$toasted.show(this.$tc(msg, undefined, {email: share.email}), {
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

    private get invitationList() {
        return this.current.invitations;
    }

    @Watch('invitationList')
    private onInvitationsChange(newInvitations: ShareInfo[]) {
        this.fillInvitationRows(newInvitations);
    }

    private get shareList() {
        return this.current.shares;
    }

    @Watch('shareList')
    private onSharesChange(newShares: ShareInfo[]) {
        this.fillShareRows(newShares);
    }

    private fillInvitationRows(invitations: ShareInfo[]) {
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

    private fillShareRows(shares: ShareInfo[]) {
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
</script>


<style lang="scss" scoped>
.flex-container {
    display: flex;
    flex-direction: row;
    /* flex-wrap: wrap; */
    justify-content: space-between;
}
</style>
