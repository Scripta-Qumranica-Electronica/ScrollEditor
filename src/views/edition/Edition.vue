<template>
    <div class="container">
        <div class="mb-3 border-container">
            <b-row>
                <b-col class="col-5 mt-4 mb-3">
                    <router-link
                        :to="{ path: `/editions/${editionId}/artefacts` }"
                    >
                        <span class="name-edition" v-if="currentEdition">
                            {{ versionString(currentEdition) }}
                        </span>
                    </router-link>
                </b-col>

                <b-col class="col-7 mt-4 mb-3">
                    <div class="btns-permiss" v-if="currentEdition">
                        <b-button class="mr-2" @click="openMetadata()">Manuscript Information</b-button>
                        <b-button
                            class="mr-2"
                            v-if="isAdmin"
                            @click="openPermissionModal"
                        >
                            <i class="fa fa-lock mr-1"></i>
                            Collaborators
                        </b-button>
                        <b-button disabled>
                            <i class="fa fa-lock mr-1"></i>Publish
                        </b-button>
                    </div>
                </b-col>
            </b-row>
        </div>
        <div v-if="isWaiting">
            <Waiting></Waiting>
        </div>
        <div v-if="!isWaiting">
            <b-row>
                <b-col class="col-4">
                    <label for="show" class="search-bar">{{
                        $t('home.show')
                    }}</label>
                </b-col>
            </b-row>
            <div>
                <b-button-group class="btns-groups">
                    <b-button
                        variant="outline-primary"
                        :to="`/editions/${editionId}/artefacts`"
                        >Artefacts {{ artefactsLength }}</b-button
                    >
                    <b-button
                        variant="outline-primary"
                        :to="`/editions/${editionId}/imaged-objects`"
                        >Imaged Objects {{ imagedObjectsLength }}</b-button
                    >
                </b-button-group>
            </div>
        </div>
        <div class="row" v-if="!isWaiting">
            <div class="col">
                <router-view></router-view>
            </div>
        </div>
        <permission-modal v-if="currentEdition"></permission-modal>
        <edition-metadata-modal></edition-metadata-modal>
        <!-- :visible="false" to prevent false display of the modal -->
    </div>
</template>

<script lang="ts">
// import Vue from 'vue';
import { Component, Prop, Emit, Vue } from 'vue-property-decorator';

import EditionSidebar from './components/sidebar.vue';
import { EditionInfo } from '@/models/edition.js';
import Waiting from '@/components/misc/Waiting.vue';

import { Artefact } from '@/models/artefact';

import PermissionModal from './components/permission-modal.vue';
import EditionMetadataModal from './components/metadata.vue';

@Component({
    name: 'edition',
    components: {
        EditionSidebar,
        Waiting,
        PermissionModal,
        'edition-metadata-modal': EditionMetadataModal,
    },
})
export default class Edition extends Vue {
    // protected (not private) to allow future inheritance
    // =======================================================

    // protected waiting: boolean = true;

    protected editionId: number = 0;
    protected page: string = '';
    protected isLoading: boolean = false;

    public get isWaiting(): boolean {
        return this.isLoading;
    }

    private get user(): boolean {
        return this.$state.session.user ? true : false;
    }

    public get currentEdition(): EditionInfo | null {
        return this.$state.editions.current!;
    }

    public get isAdmin(): boolean {
        return this.currentEdition!.permission.isAdmin;
    }

    private get copyTooltip(): string {
        const publicStr = this.currentEdition!.isPublic
            ? 'This is a public Edition. '
            : '';

        return (
            (this.currentEdition!.isPublic
                ? 'This is a public Edition. Create a copy in order to'
                : 'Create a copy and') + ' Edit this Edition'
        );
    }

    private openMetadata() {
        this.$root.$emit('bv::show::modal', 'editionMetadataModal');
    }

    protected get artefactsLength(): number {
        const virtualCount = this.$state.artefacts.items.reduce(
            (count, art: Artefact) => {
                if (art.isVirtual) {
                    count++;
                }
                return count;
            },
            0
        );

        return this.$state.artefacts.items.length - virtualCount;
    }

    protected get imagedObjectsLength(): number {
        return this.$state.imagedObjects.items.length;
    }

    // This code is not in the created method since it's asynchronous,
    // and Vue doesn't wait for an asynchornous created to finish
    // before calling mounted.
    // Instead of adding synchronization between created and mounted,
    //  we just moved it to mounted.
    // ( same mechanism as in scroll-editor.vue )

    protected async mounted() {
        this.isLoading = true;
        this.editionId = parseInt(this.$route.params.editionId, 10);

        // Wait for editionInfo object to be valid
        // (in order not to get run-time undefined errors)
        // $state.prepare.edition is an async edition(editionId: number): Promise<void>
        //  returning an editionInternal(id));    }

        await this.$state.prepare.edition(this.editionId);

        // Added as in scroll-editor.vue
        const currentEdition = this.$state.editions.find(this.editionId);

        // This is done also in scroll-editor
        if (currentEdition) {
            this.$state.editions.current = currentEdition;
            this.$state.artefacts.current = null;
            this.$state.imagedObjects.current = null;
        }

        this.isLoading = false;
        this.getPage(window.location.href);
    }

    // Navigation Guards:
    // Fetching data Before Navigation to new route,
    // when route changes and this component is already rendered.
    // We're still in prev view
    // while resource is being fetched for the incoming view
    // ==========================================================

    protected async beforeRouteUpdate(to: any, from: any, next: () => void) {
        this.editionId = parseInt(to.params.editionId, 10);

        // Wait for editionInfo object to be valid
        await this.$state.prepare.edition(this.editionId);

        this.getPage(to.path);

        // call next() when fetch complete
        next();
    }

    // methods => member functions of the class
    // ============================================================

    protected openPermissionModal() {
        this.$root.$emit('bv::show::modal', 'permissionModal');
        // event, new_value
    }

    protected versionString(ver: EditionInfo): string {
        return ver.name;
    }

    protected getPage(url: string) {
        if (url.endsWith('artefacts')) {
            this.page = 'artefacts';
        } else {
            this.page = 'imaged-objects';
        }
    }
}
</script>

<style lang="scss" scoped>
@import '@/assets/styles/_variables.scss';
@import '@/assets/styles/_fonts.scss';
.btns-permiss {
    float: right;
}
.btns-permiss button {
    background-color: $dark-backround-grey;
    border-color: $dark-backround-grey;
    color: white;
    font-weight: $font-weight-3;
    font-size: $font-size-2;
    font-family: $font-family;
}

.btns-permiss button:active,
.btns-permiss button:focus,
.btns-permiss button:hover,
.btns-permiss button.disabled {
    color: #fff;
    background-color: $dark-backround-grey !important;
    border-color: $dark-backround-grey !important;
}
.name-edition {
    font-style: $font-style;
    font-weight: $font-weight-3;
    font-size: $font-size-3;
    font-family: $font-family;
    color: $black;
}
#sidebar {
    float: left;
}

#fragments {
    float: right;
}
.btns-groups a {
    border: 2px solid transparent;
    color: $black;
    background-color: white;
    border-color: $grey;
    font-style: $font-style;
    font-weight: $font-weight-1;
    font-size: $font-size-2;
    font-family: $font-family;
}
.btns-groups a:hover,
.btns-groups:not(:disabled):not(.disabled):active {
    border: 2px solid transparent;
    color: $blue;
    background-color: white;
    border-color: $blue;
}
.btn-secondary.disabled,
.btn-secondary.disabled:hover {
    cursor: not-allowed;
    border-color: $dark-backround-grey !important;
    background-color: $dark-backround-grey !important;
}
.border-container {
    border-bottom: 2px solid #dce1ea;
}
</style>
