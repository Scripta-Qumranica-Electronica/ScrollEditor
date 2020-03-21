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
                                    :disabled="share.oldPermission === 'admin' || share.permission === share.oldPermission"
                                >{{ setButtonStatus(share, 'Update') }}</b-button>
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
                                >{{ setButtonStatus(invit, 'Resend') }}</b-button>
                            </div>
                        </b-list-group-item>
                    </b-list-group>
                </b-card>
            </form>
        </b-modal>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Emit } from 'vue-property-decorator';
import {
    EditionInfo,
    ShareInfo,
    ShareRow,
    SimplifiedPermission
} from '@/models/edition';
import EditionService from '@/services/edition';
import { ImagedObject } from '@/models/imaged-object';

@Component({
    name: 'permission-modal',
    components: {}
})
export default class PermissionModal extends Vue {
    public invitationRow: ShareRow = {} as ShareRow;
    public editionService: EditionService = new EditionService();

    // public permissionsChanges: ShareRow[] = [];

    public get sharesRows(): ShareRow[] {
        return this.current!.shares.map(x => ({
            email: x.user.email,
            oldPermission: x.simplified,
            permission: x.simplified
        }));
    }

    public get invitationsRows(): ShareRow[] {
        return this.current!.invitations.map(x => ({
            email: x.user.email,
            oldPermission: x.simplified,
            permission: x.simplified
        }));
    }

    public get current(): EditionInfo | undefined {
        return this.$state.editions.current;
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
    }
    public setButtonStatus(row: ShareRow, defaultText: string) {
        let btnText = defaultText;
        if (row.permission !== row.oldPermission) {
            btnText = 'Update';
        }
        if (row.permission === 'none') {
            btnText = 'Revoke';
        }
        return btnText;
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
