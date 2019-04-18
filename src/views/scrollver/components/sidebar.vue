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
                <router-link :to="`/scroll/${current.id}/artefacts`" replace>
                    {{ $t('home.artefacts') }}: {{ artefacts }} 
                </router-link>
            </b-nav-item>
            <b-nav-item>
                <router-link :to="`/scroll/${current.id}/fragments`" replace>
                    {{ $t('home.fragments') }}: {{ fragments }}
                </router-link>
            </b-nav-item><!-- {{ current.numOfFragments }} , {{ current.otherVersions.length + 1 }}-->
            <b-nav-item-dropdown v-if="current.otherVersions.length" :text="$t('home.versions')">
                <b-dropdown-item v-for="version in current.otherVersions" :key="version.id"
                                 :to="`/scroll/${version.id}`">
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
                 @ok="copyScroll"
                 :ok-title="$t('misc.copy')"
                 :cancel-title="$t('misc.cancel')"
                 :ok-disabled="waiting || !canCopy"
                 :cancel-disabled="waiting">
            <form @submit.stop.prevent="copyScroll">
                <b-form-group :label="$t('home.newScrollName')"
                              label-for="newCopyName"
                              :description="$t('home.newScrollDesc')">
                    <b-form-input ref="newCopyName"
                                  id="newName" 
                                  v-model="newCopyName" 
                                  type="text"
                                  @keyup.enter="copyScroll" 
                                  required 
                                  :placeholder="$t('home.newScrollName')">
                    </b-form-input>
                </b-form-group>
                <p v-if="waiting">
                    {{ $t('home.copyingScroll') }}...
                    <font-awesome-icon icon="spinner" spin></font-awesome-icon>
                </p>
                <p class="text-danger" v-if="errorMessage">{{ errorMessage }}</p>
            </form>
        </b-modal>
    </div>
</template>

<script lang="ts">
import Vue, { PropOptions } from 'vue';
import { ScrollVersionInfo } from '@/models/scroll';
import ScrollService from '@/services/scroll';
import { ImagedFragment } from '../../../models/fragment';

export default Vue.extend({
    name: 'scroll-ver-sidebar',
    data() {
        return {
            scrollService: new ScrollService(this.$store),
            newCopyName: '',
            waiting: false,
            errorMessage: '',
        };
    },
    computed: {
        canCopy(): boolean {
            return this.newCopyName.trim().length > 0;
        },
        current(): ScrollVersionInfo {
            return this.$store.state.scroll.scrollVersion;
        },
        isNew(): boolean {
            return this.current.id === this.$store.state.scroll.newScrollVersionId;
        },
        fragments(): number {
            if (this.$store.state.scroll.fragments) {
                return this.$store.state.scroll.fragments.length;
            }
            return 100;
        },
        artefacts(): number {
            if (this.$store.state.scroll.fragments) {
                let artLen = 0;
                this.$store.state.scroll.fragments.forEach((element: ImagedFragment) => {
                    artLen += element.artefacts.length;
                });
                return artLen;
            }
            return 110;
        }
    },
    methods: {
        versionString(ver: ScrollVersionInfo) {
            return `${ver.name} - ${ver.owner.userName}`;
        },
        async copyScroll(evt: Event) {
            evt.preventDefault();

            if (!this.canCopy) {
                return;  // ENTER key calls this handler even if the button is disabled
            }
            this.newCopyName = this.newCopyName.trim();

            this.waiting = true;
            this.errorMessage = '';
            try {
                const newScrollVersionId = await this.scrollService.copyScrollVersion(this.current.id);

                if (this.current.name !== this.newCopyName) {
                    await this.scrollService.renameScrollVersion(newScrollVersionId, this.newCopyName);
                }

                this.$store.dispatch('scroll/setNewScrollVersionId',
                                     newScrollVersionId,
                                     { root: true }) ;
                this.$router.push({
                    path: `/scroll/${newScrollVersionId}`,
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
