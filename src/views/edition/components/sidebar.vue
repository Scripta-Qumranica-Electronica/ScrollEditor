<template>
    <div v-if="current">
        <div class="sidebar-header">
            <h5>
                {{ versionString(current) }}
                <span
                    class="badge badge-success"
                    v-if="isNew"
                >{{ $t('misc.new') }}</span>
            </h5>

            <b-btn
                v-if="canRename && !renaming"
                @click="openRename()"
                class="btn btn-sm"
            >{{ $t('misc.rename') }}</b-btn>

            <input v-if="renaming" v-model="newEditionName" />
            <b-btn
                v-if="renaming"
                @click="onRename(newEditionName)"
                class="btn btn-sm"
            >{{ $t('misc.save') }}</b-btn>
        </div>

        <b-nav vertical>
            <label v-if="readOnly">
                <i v-b-tooltip.hover.bottom :title="$t('home.lock')" class="fa fa-lock"></i> ReadOnly
            </label>
            <!-- TODO: add numOfArtefacts and numOfFragments -->
            <b-nav-item>
                <router-link
                    :class="{ bold: page === 'artefacts',artefacts }"
                    :to="`/editions/${current.id}/artefacts`"
                    replace
                >{{ $t('home.artefacts') }}: {{ artefacts }}</router-link>
            </b-nav-item>
            <b-nav-item>
                <router-link
                    :class="{ bold: page === 'imaged-objects',imagedObjects  }"
                    :to="`/editions/${current.id}/imaged-objects`"
                    replace
                >{{ $t('home.imagedObjects') }}: {{ imagedObjects }}</router-link>
            </b-nav-item>
            <!-- {{ current.numOfFragments }} , {{ current.otherVersions.length + 1 }}-->
            <b-nav-item-dropdown v-if="current.otherVersions.length" :text="$t('home.versions')">
                <b-dropdown-item
                    v-for="version in current.otherVersions"
                    :key="version.id"
                    :to="`/editions/${version.id}`"
                >{{ versionString(version) }}</b-dropdown-item>
            </b-nav-item-dropdown>
            <b-nav-text v-if="!current.otherVersions.length">
                <small class="no-vers">{{ $t("home.noVersions") }}</small>
            </b-nav-text>
            <b-btn
                v-if="user"
                v-b-modal.modal="'copyModal'"
                class="btn btn-sm btn-outline btn-copy"
            >{{ $t('misc.copy') }}</b-btn>
        </b-nav>

        <b-modal
            id="copyModal"
            ref="copyModalRef"
            :title="$t('home.copyTitle', { name: current.name, owner: current.owner.forename })"
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
                        ref="newCopyName"
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
    </div>
</template>

<script lang="ts">
import Vue, { PropOptions } from 'vue';
import { EditionInfo } from '@/models/edition';
import EditionService from '@/services/edition';
import { ImagedObject } from '@/models/imaged-object';

export default Vue.extend({
    name: 'edition-ver-sidebar',
    props: {
        page: String
    },
    data() {
        return {
            editionService: new EditionService(),
            newCopyName: '',
            waiting: false,
            errorMessage: '',
            newEditionName: '',
            renaming: false
        };
    },
    computed: {
        readOnly(): boolean {
            return this.current!.permission.readOnly;
        },
        canRename(): boolean {
            return this.current!.permission.mayWrite;
        },
        user(): boolean {
            return this.$state.session.user ? true : false;
        },
        canCopy(): boolean {
            return this.newCopyName.trim().length > 0;
        },
        current(): EditionInfo | undefined {
            return this.$state.editions.current;
        },
        isNew(): boolean {
            if (this.current) {
                return this.current.id === this.$state.misc.newEditionId;
            }
            return false;
        },
        imagedObjects(): number {
            if (this.$state.imagedObjects.items) {
                return this.$state.imagedObjects.items.length;
            }
            return 0;
        },
        artefacts(): number {
            if (this.$state.imagedObjects.items) {
                let artLen = 0;
                this.$state.imagedObjects.items.forEach(
                    (element: ImagedObject) => {
                        artLen += element.artefacts.length;
                    }
                );
                return artLen;
            }
            return 0;
        }
    },
    methods: {
        openRename() {
            this.renaming = true;
            this.newEditionName = this.current!.name;
        },
        showMessage(msg: string, type: string = 'info') {
            this.$toasted.show(msg, {
                type,
                position: 'top-right',
                duration: 7000
            });
        },
        versionString(ver: EditionInfo) {
            return ver.name;
        },
        async copyEdition(evt: Event) {
            evt.preventDefault();

            if (!this.canCopy) {
                return; // ENTER key calls this handler even if the button is disabled
            }
            this.newCopyName = this.newCopyName.trim();

            this.waiting = true;
            this.errorMessage = '';
            try {
                const newEdition = await this.editionService.copyEdition(
                    this.current!.id,
                    this.newCopyName
                );

                this.$state.misc.newEditionId = newEdition.id;

                this.$router.push({
                    path: `/editions/${newEdition.id}`
                });
                (this.$refs.copyModalRef as any).hide();
            } catch (err) {
                this.errorMessage = err;
            } finally {
                this.waiting = false;
            }
        },
        copyModalShown() {
            this.newCopyName = this.current!.name;
            (this.$refs.newCopyName as any).focus();
        },
        async onRename(newName: string) {
            if (!this.current) {
                throw new Error("Can't rename if there is no edition");
            }
            this.renaming = true;
            try {
                await this.editionService.renameEdition(
                    this.current!.id,
                    newName
                );
                this.showMessage('edition renamed', 'success');
            } catch (err) {
                this.showMessage('edition rename failed', 'error');
            } finally {
                this.renaming = false;
            }
        }
    }
});
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
