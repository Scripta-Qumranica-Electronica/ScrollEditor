<template>
    <div v-if="current">
        <div class="sidebar-header">
            <h5>{{ versionString(current) }} 
                <span class="badge badge-success" v-if="isNew">{{ $t('misc.new') }}</span>
            </h5>
        </div>

        <b-nav vertical>
            <!-- TODO: add numOfArtefacts and numOfFragments -->
            <b-nav-item>
                <router-link :to="`/editions/${current.id}/artefacts`" replace>
                    {{ $t('home.artefacts') }}: {{ artefacts }} 
                </router-link>
            </b-nav-item>
            <b-nav-item>
                <router-link :to="`/editions/${current.id}/imaged-objects`" replace>
                    {{ $t('home.imagedObjects') }}: {{ imagedObjects }}
                </router-link>
            </b-nav-item><!-- {{ current.numOfFragments }} , {{ current.otherVersions.length + 1 }}-->
            <b-nav-item-dropdown v-if="current.otherVersions.length" :text="$t('home.versions')">
                <b-dropdown-item v-for="version in current.otherVersions" :key="version.id"
                                 :to="`/editions/${version.id}`">
                    {{ versionString(version) }}
                </b-dropdown-item>
            </b-nav-item-dropdown>
            <b-nav-text v-if="!current.otherVersions.length">
                <small>{{ $t("home.noVersions") }}</small>
            </b-nav-text>
            <b-btn v-b-modal.modal="'copyModal'" class="btn btn-sm btn-outline">{{ $t('misc.copy') }}</b-btn>
        </b-nav>

        <b-modal id="copyModal" 
                 :title="$t('home.copyTitle', { name: current.name, owner: current.owner.userName })"
                 @shown="copyModalShown"
                 @ok="copyEdition"
                 :ok-title="$t('misc.copy')"
                 :cancel-title="$t('misc.cancel')"
                 :ok-disabled="waiting || !canCopy"
                 :cancel-disabled="waiting">
            <form @submit.stop.prevent="copyEdition">
                <b-form-group :label="$t('home.newEditionName')"
                              label-for="newCopyName"
                              :description="$t('home.newEditionDesc')">
                    <b-form-input ref="newCopyName"
                                  id="newName" 
                                  v-model="newCopyName" 
                                  type="text"
                                  @keyup.enter="copyEdition" 
                                  required 
                                  :placeholder="$t('home.newEditionName')">
                    </b-form-input>
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
import { ImagedObjectSimple } from '@/models/imaged-object';

export default Vue.extend({
    name: 'edition-ver-sidebar',
    data() {
        return {
            editionService: new EditionService(this.$store),
            newCopyName: '',
            waiting: false,
            errorMessage: '',
        };
    },
    computed: {
        canCopy(): boolean {
            return this.newCopyName.trim().length > 0;
        },
        current(): EditionInfo {
            return this.$store.state.edition.editionId;
        },
        isNew(): boolean {
            return this.current.id === this.$store.state.edition.newEditionId;
        },
        imagedObjects(): number {
            if (this.$store.state.edition.imagedObjects) {
                return this.$store.state.edition.imagedObjects.length;
            }
            return 100;
        },
        artefacts(): number {
            if (this.$store.state.edition.imagedObjects) {
                let artLen = 0;
                this.$store.state.edition.imagedObjects.forEach((element: ImagedObjectSimple) => {
                    artLen += element.artefacts.length;
                });
                return artLen;
            }
            return 110;
        }
    },
    methods: {
        versionString(ver: EditionInfo) {
            return `${ver.name} - ${ver.owner.userName}`;
        },
        async copyEdition(evt: Event) {
            evt.preventDefault();

            if (!this.canCopy) {
                return;  // ENTER key calls this handler even if the button is disabled
            }
            this.newCopyName = this.newCopyName.trim();

            this.waiting = true;
            this.errorMessage = '';
            try {
                const name = this.current.name !== this.newCopyName ? this.newCopyName : undefined;
                const newEditionId = await this.editionService.copyEdition(this.current.id, name);

                this.$store.dispatch('edition/setNewEditionId',
                    newEditionId,
                    {root: true});
                this.$router.push({
                    path: `/edition/${newEditionId}`,
                });
            } catch (err) {
                this.errorMessage = err;
            } finally {
                this.waiting = false;
            }
        },
        copyModalShown() {
            this.newCopyName = this.current.name;
            (this.$refs.newCopyName as any).focus();
        },
    },
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
</style>
