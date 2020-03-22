<template>
    <div v-if="current">
        <b-modal id="permissionModal" hide-footer>
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
                            ></b-form-input>
                            <b-form-select
                                size="sm"
                                class="col-4 ml-2"
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
                                class="ml-2"
                                @click="invite"
                                :disabled="invitationRow.email === '' || !invitationRow.permission"
                            >{{ $t('misc.invite') }}</b-button>
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
                                    :disabled="share.oldPermission === 'admin'"
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
                                    :disabled="share.disableButton"
                                >{{share.buttonText}}</b-button>
                            </div>
                        </b-list-group-item>
                    </b-list-group>
                </b-card>
                <!-- invitations rows -->
                <b-card no-body header="Invitations">
                    <b-list-group flush>
                        <b-list-group-item
                            v-for="invit in invitationsRows"
                            v-bind:key="invit.email"
                        >
                            <div class="row">
                                <span class="col-6">{{invit.email}}</span>
                                <b-form-select
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
                                >{{invit.buttonText}}</b-button>
                            </div>
                        </b-list-group-item>
                    </b-list-group>
                </b-card>
            </form>
        </b-modal>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Emit, Watch } from 'vue-property-decorator';
import { EditionInfo, ShareInfo, SimplifiedPermission } from '@/models/edition';
import EditionService from '@/services/edition';
import { ImagedObject } from '@/models/imaged-object';
import { BvModalEvent } from 'bootstrap-vue';

interface ShareRow {
    email: string;
    oldPermission: SimplifiedPermission;
    permission: SimplifiedPermission;
    buttonText?: string;
    disableButton?: boolean;
}
@Component({
    name: 'permission-modal',
    components: {}
})
export default class PermissionModal extends Vue {
    public invitationRow: ShareRow = { permission: 'read' } as ShareRow;
    public editionService: EditionService = new EditionService();

    // public permissionsChanges: ShareRow[] = [];

    public sharesRows: ShareRow[] = [];
    public invitationsRows: ShareRow[] = [];

    public mounted() {
        this.$root.$on(
            'bv::modal::show',
            (bvEvent: BvModalEvent, modalId: string) => {
                if (modalId !== 'permissionModal') {
                    return;
                }

                this.sharesRows = this.current!.shares.map(x => ({
                    email: x.user.email,
                    oldPermission: x.simplified,
                    permission: x.simplified,
                    buttonText: 'Update',
                    disableButton: true
                }));

                this.invitationsRows = this.current!.invitations.map(x => ({
                    email: x.user.email,
                    oldPermission: x.simplified,
                    permission: x.simplified,
                    buttonText: 'Resend'
                }));
            }
        );
    }

    public get current(): EditionInfo {
        return this.$state.editions.current!;
    }

    public update(share: ShareRow) {
        this.editionService.updateInvitation(
            this.current!.id,
            share.email,
            share.permission
        );
    }
    public invite() {
        this.editionService.inviteEditor(
            this.current!.id,
            this.invitationRow.email,
            this.invitationRow.permission
        );
        this.invitationRow.email = '';
        this.invitationRow.permission = 'read';
    }

    public setRowShareStatus(row: ShareRow) {
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
         this.invitationsRows = this.current!.invitations.map(x => ({
                    email: x.user.email,
                    oldPermission: x.simplified,
                    permission: x.simplified,
                    buttonText: 'Resend'
                }));
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
