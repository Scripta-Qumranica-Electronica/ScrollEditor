<template>
    <div v-if="current">
        <h5>{{ versionString(current) }} <span class="badge badge-success" v-if="isNew">New</span></h5>
        <ul>
            <li>Artefacts: {{ current.numOfArtefacts }}</li>
            <li>Columns &amp; Fragments: {{ current.numOfColsFrags }}</li>
        </ul>
        <legend><h6>Versions</h6></legend>
        <ul id="version-list">
            <router-link tag="li" v-for="version in versions" :key="version.versionId"
                         :to="{ name: 'scroll-ver', params: { id: version.versionId }}">
                {{ versionString(version) }} 
                <span v-if="version.versionId===current.versionId" class="badge badge-secondary">Current</span>
            </router-link>
        </ul>
        <b-btn v-b-modal.modal="'copyModal'" class="btn btn-sm btn-outline">Copy</b-btn>

        <b-modal id="copyModal" 
                 :title="`Copy ${current.name} by ${current.owner.userName}`" 
                 @shown="copyModalShown"
                 @ok="copyScroll"
                 :ok-disabled="waiting || !canCopy"
                 :cancel-disabled="waiting">
            <form @submit.stop.prevent="copyScroll">
                <b-form-group label="New Scroll Name"
                              label-for="newCopyName"
                              description="Please provide a name for the new scroll">
                    <b-form-input ref="newCopyName"
                                  id="newName" 
                                  v-model="newCopyName" 
                                  type="text"
                                  @keyup.enter="copyScroll" 
                                  required placeholder="Scroll Name">
                    </b-form-input>
                </b-form-group>
                <p v-if="waiting">
                    Copying scroll...
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
                const newScrollVersion = await this.scrollService.copyScrollVersion(this.current.versionId);

                if (this.current.name !== this.newCopyName) {
                    await this.scrollService.renameScrollVersion(newScrollVersion, this.newCopyName);
                }

                this.$router.push({
                    name: 'scroll-ver',
                    params: {
                        id: newScrollVersion.toString(),
                        new: 'new',
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
