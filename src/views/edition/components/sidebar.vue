<template>
    <div v-if="currentEdition">
        <div class="sidebar-header">
            <h5>
                {{ versionString(currentEdition) }}
                <span
                    class="badge badge-success"
                    v-if="isNew"
                >{{ $t('misc.new') }}</span>
                <edition-icons :edition="currentEdition" :show-text="false" />
            </h5>

            <b-btn
                v-if="canRename && !renaming"
                @click="openRename()"
                class="btn btn-sm btn-rename"
            >{{ $t('misc.rename') }}</b-btn>

            <input class="new-edition" v-if="renaming" v-model="newEditionName" />
            <b-btn
                v-if="renaming"
                @click="onRename(newEditionName)"
                class="btn btn-sm btn-save"
            >{{ $t('misc.save') }}</b-btn>
        </div>

        <b-nav vertical>
            <!-- TODO: add numOfArtefacts and numOfFragments -->
            <b-nav-item>
                <router-link
                    :class="{ bold: page === 'artefacts',artefacts }"
                    :to="`/editions/${currentEdition.id}/artefacts`"
                    replace
                >{{ $t('home.artefacts') }}: {{ artefacts }}</router-link>
            </b-nav-item>
            <b-nav-item>
                <router-link
                    :class="{ bold: page === 'imaged-objects',imagedObjects  }"
                    :to="`/editions/${currentEdition.id}/imaged-objects`"
                    replace
                >{{ $t('home.imagedObjects') }}: {{ imagedObjects || '…' }}</router-link>
            </b-nav-item>
              <b-nav-item>
                <router-link
                    class="scroll"
                    :class="{ bold: page === 'scroll' }"
                    :to="`/editions/${currentEdition.id}/scroll-editor`"
                    replace
                >{{ $t('home.scroll') }}</router-link>
            </b-nav-item>
            <!-- {{ current.numOfFragments }} , {{ current.otherVersions.length + 1 }}-->
            <b-nav-item-dropdown v-if="currentEdition.otherVersions.length" :text="$t('home.versions')">
                <b-dropdown-item
                    v-for="version in currentEdition.otherVersions"
                    :key="version.id"
                    :to="`/editions/${version.id}`"
                >{{ versionString(version) }}</b-dropdown-item>
            </b-nav-item-dropdown>
            <b-nav-text v-if="!currentEdition.otherVersions.length">
                <small class="no-vers">{{ $t("home.noVersions") }}</small>
            </b-nav-text>
            <b-btn
                v-if="user"
                @click="copyModalVisible = true"
                class="btn btn-sm btn-outline btn-copy"
            >{{ $t('misc.copy') }}</b-btn>
            <!-- v-b-modal.permissionModal -->
            <b-btn
                v-if="isAdmin"
                @click="openPermissionModal()"
                class="btn btn-sm btn-outline btn-permission"
            >{{ $t('misc.permission') }}</b-btn>
        </b-nav>

        <b-modal lazy
            id="copyModal"
            v-model="copyModalVisible"
            :title="$t('home.copyTitle', { name: currentEdition.name, owner: currentEdition.owner.forename })"
            @shown="copyModalShown"
            @ok="copyEdition"
            :ok-title="$t('misc.copy')"
            :cancel-title="$t('misc.cancel')"
            :ok-disabled="waiting || !canCopy"
            :cancel-disabled="waiting"
        >
            <form @submit.stop.prevent="copyEdition">
                <b-form-group
                    :label="$t('home.newEditionName')"
                    label-for="newCopyName"
                    :description="$t('home.newEditionDesc')"
                >
                    <b-form-input
                        ref="newCopyNameRef"
                        id="newName"
                        v-model="newCopyName"
                        type="text"
                        @keyup.enter="copyEdition"
                        required
                        :placeholder="$t('home.newEditionName')"
                    ></b-form-input>
                </b-form-group>
                <p v-if="waiting">
                    {{ $t('home.copyingEdition') }}...
                    <font-awesome-icon icon="spinner" spin></font-awesome-icon>
                </p>
                <p class="text-danger" v-if="errorMessage">{{ errorMessage }}</p>
            </form>
        </b-modal>
        <permission-modal></permission-modal>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Emit, Vue, toNative } from 'vue-facing-decorator';
import { showModal } from '@/utils/modal-bus';
import type { BvTriggerableEvent } from 'bootstrap-vue-next';
import { EditionInfo } from '@/models/edition';
import EditionService from '@/services/edition';
import { ImagedObject } from '@/models/imaged-object';
import PermissionModal from './permission-modal.vue';
import EditionIcons from '@/components/cues/edition-icons.vue';


@Component({
    name: 'edition-ver-sidebar',
    components: {
        PermissionModal,
        EditionIcons
    }
})
class SideBar extends Vue {

    @Prop() public page!: string;


    public editionId: number = 0;
    public editionService: EditionService = new EditionService() ;
    public newCopyName: string = '';
    public waiting: boolean = false;
    public errorMessage: string =  '';
    public newEditionName: string =  '';
    public renaming: boolean = false;
    public copyModalVisible: boolean = false;

    public get currentEdition(): EditionInfo | null {
        return this.$state.editions.current ;
    }


    public get readOnly(): boolean {
        return this.currentEdition!.permission.readOnly;
    }

    public get isAdmin(): boolean {
        return this.currentEdition!.permission.isAdmin;
    }

    public get canRename(): boolean {
        return this.currentEdition!.permission.mayWrite;
    }

    public get user(): boolean {
        return this.$state.session.user ? true : false;
    }

    public get canCopy(): boolean {
        return this.newCopyName.trim().length > 0;
    }


    public get isNew(): boolean {
        if (this.currentEdition) {
            return this.currentEdition.id === this.$state.misc.newEditionId;
        }
        return false;
    }

    public get imagedObjects(): number {
        if (this.$state.imagedObjects.items) {
            return this.$state.imagedObjects.items.length;
        }
        return 0;
    }

    public get artefacts(): number {
        // Count real (non-virtual) artefacts directly. Previously summed from the
        // imaged objects, but those are now loaded lazily, so read the artefacts
        // collection instead.
        return this.$state.artefacts.items.filter(a => !a.isVirtual).length;
    }


    public openPermissionModal() {
        showModal('permissionModal');
    }

    public openRename() {
        this.renaming = true;
        this.newEditionName = this.currentEdition!.name;
    }

    public showMessage(msg: string, type: string = 'info') {
        this.$toasted.show(this.$tc(msg), {
            type,
            position: 'top-right',
            duration: 7000
        });
    }

    public versionString(ver: EditionInfo) {
        return ver.name;
    }

    public async copyEdition(evt: Event | BvTriggerableEvent) {
        evt.preventDefault();

        if (!this.canCopy) {
            return; // ENTER key calls this handler even if the button is disabled
        }
        this.newCopyName = this.newCopyName.trim();

        this.waiting = true;
        this.errorMessage = '';
        try {
            const newEdition = await this.editionService.copyEdition(
                this.currentEdition!.id,
                this.newCopyName
            );

            this.$state.misc.newEditionId = newEdition.id;

            this.$router.push({
                path: `/editions/${newEdition.id}`
            });
            this.copyModalVisible = false;
        } catch (err) {
            this.errorMessage = String(err);
        } finally {
            this.waiting = false;
        }
    }

    public copyModalShown() {
        this.newCopyName = this.currentEdition!.name;
        (this.$refs.newCopyNameRef as any).focus();
    }

    public async onRename(newName: string) {
        if (!this.currentEdition) {
            throw new Error("Can't rename if there is no edition");
        }
        this.renaming = true;
        try {
            await this.editionService.renameEdition(
                this.currentEdition!.id,
                newName
            );
            this.showMessage('toasts.editionSuccess', 'success');
        } catch (err) {
            this.showMessage('toasts.editionError', 'error');
        } finally {
            this.renaming = false;
        }
    }

}
export default toNative(SideBar);
</script>

<style lang="scss" scoped>
ul {
    list-style-type: none;
    padding: 0px;
}

ul#links {
    cursor: pointer;
    li.router-link-active {
        font-weight: bold;
    }
}

ul#version-list li {
    cursor: pointer;
}

.bold {
    font-weight: bold;
}
</style>
