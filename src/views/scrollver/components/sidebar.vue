<template>
    <div v-if="current">
        <h5>{{ versionString(current) }} <span class="badge badge-success" v-if="isNew">{{ $t('misc.new') }}</span></h5>
        <ul>
            <li>{{ $t('home.artefacts') }}: {{ current.numOfArtefacts }}</li>
            <li>{{ $t('home.colsAndFrags') }}: {{ current.numOfColsFrags }}</li>
        </ul>
        <legend><h6>{{ $t('home.versions') }}</h6></legend>
        <ul id="version-list">
            <router-link tag="li" v-for="version in versions" :key="version.versionId"
                         :to="{ name: 'scroll-ver', params: { id: version.versionId }}">
                {{ versionString(version) }} 
                <span v-if="version.versionId===current.versionId" class="badge badge-secondary">{{ $t('misc.current') }}</span>
            </router-link>
        </ul>
        <b-btn v-b-modal.modal="'copyModal'" class="btn btn-sm btn-outline">{{ $t('misc.copy') }}</b-btn>

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

export default Vue.extend({
    name: 'scroll-ver-sidebar',
    props: {
        versions: {
            type: Array,
        } as PropOptions<ScrollVersionInfo[]>,
        current: ScrollVersionInfo,
        isNew: Boolean,
    },
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
                const newScrollVersionId = await this.scrollService.copyScrollVersion(this.current.versionId);

                if (this.current.name !== this.newCopyName) {
                    await this.scrollService.renameScrollVersion(newScrollVersionId, this.newCopyName);
                }

                this.$store.dispatch('miscUI/setNewScrollVersionId',
                                     newScrollVersionId,
                                     { root: true }) ;
                this.$router.push({
                    name: 'scroll-ver',
                    params: {
                        id: newScrollVersionId.toString(),
                    },
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

ul#version-list li {
    cursor: pointer;
}
</style>
