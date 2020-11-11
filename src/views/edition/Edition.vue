<template>
    <div class="container">
        <div class="mb-3 border-container">
            <b-row>
                <b-col class="col-4 mt-4 mb-3">
                    <span class="name-edition" v-if="edition">
                        {{ versionString(edition) }}
                    </span>
                </b-col>
                <b-col class="col-8 mt-4 mb-3">
                    <div class="btns-permiss" v-if="current">
                        <b-button
                            class="mr-3"
                            v-if="isAdmin"
                            @click="openPermissionModal()"
                            ><i class="fa fa-lock mr-1"></i>Collaborators</b-button
                        >
                        <b-button disabled><i class="fa fa-lock mr-1"></i>Publish</b-button>
                    </div>
                </b-col>
            </b-row>
        </div>
        <div v-if="!waiting">
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
                        :to="`/editions/${edition.id}/artefacts`"
                        >Artefacts {{ artefactsLength }}</b-button
                    >
                    <b-button
                        variant="outline-primary"
                        :to="`/editions/${edition.id}/imaged-objects`"
                        >Imaged Objects {{ imagedObjectsLength }}</b-button
                    >
                      <b-button
                        variant="outline-primary"
                        :to="`/editions/${edition.id}/scroll-editor`"
                        >Entire Manuscript</b-button
                    >
                </b-button-group>
            </div>
        </div>
        <div>
            <div v-if="!waiting" class="row">
                <div class="col" v-if="waiting"><waiting></waiting></div>
                <div class="col" v-if="!waiting">
                    <router-view></router-view>
                </div>
            </div>
        </div>
        <permission-modal v-if="current"></permission-modal>
    </div>
</template>

<script lang="ts">
import Vue from 'vue';
import EditionSidebar from './components/sidebar.vue';
import { EditionInfo } from '@/models/edition.js';
import Waiting from '@/components/misc/Waiting.vue';
import PermissionModal from './components/permission-modal.vue';

export default Vue.extend({
    name: 'edition-version',
    components: {
        EditionSidebar,
        Waiting,
        PermissionModal,
    },
    data() {
        return {
            editionId: 0,
            page: '',
        };
    },
    computed: {
        current(): EditionInfo | undefined {
            return this.$state.editions.current;
        },
        isAdmin(): boolean {
            return this.current!.permission.isAdmin;
        },
        edition(): EditionInfo | undefined {
            return this.$state.editions.current;
        },
        waiting(): boolean {
            return !this.edition;
        },
        artefactsLength(): number {
            return this.$state.artefacts.items.length;
        },
        imagedObjectsLength(): number {
            return this.$state.imagedObjects.items.length;
        },
    },
    mounted() {
        this.editionId = parseInt(this.$route.params.editionId, 10);
        this.$state.prepare.edition(this.editionId);
        this.getPage(window.location.href);
    },
    beforeRouteUpdate(to, from, next) {
        this.editionId = parseInt(to.params.editionId, 10);
        this.$state.prepare.edition(this.editionId);
        this.getPage(to.path);
        next();
    },
    methods: {
        openPermissionModal() {
            this.$root.$emit('bv::show::modal', 'permissionModal');
        },
        versionString(ver: EditionInfo) {
            return ver.name;
        },
        getPage(url: string) {
            if (url.endsWith('artefacts')) {
                this.page = 'artefacts';
            } else {
                this.page = 'imaged-objects';
            }
        },
    },
});
</script>

<style lang="scss">
@import '@/assets/styles/_variables.scss';
@import '@/assets/styles/_fonts.scss';
.btns-permiss {
    float: right;
}
.btns-permiss button{
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
.btns-permiss button.disabled
 {
    color: #fff;
    background-color:$dark-backround-grey!important;
    border-color:$dark-backround-grey!important;
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
.btn-secondary.disabled:hover{
    cursor: not-allowed;
    border-color:$dark-backround-grey!important;
    background-color:$dark-backround-grey!important;
}
.border-container{
    border-bottom: 2px solid #DCE1EA;
}
</style>
