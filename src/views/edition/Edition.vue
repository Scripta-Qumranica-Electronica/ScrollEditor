<template>
    <div class="container" style="background: grey">
        <div>
            <b-row>
                <b-col class="col-4 mt-4 mb-3">
                    <span class="name-edition">
                        Rule of Blessings {{ versionString(edition) }}
                    </span>
                </b-col>
                <b-col class="col-8 mt-4 mb-3">
                    <div style="float: right">
                        <b-button>Colloborator</b-button>
                        <b-button>Publish</b-button>
                    </div>
                </b-col>
            </b-row>
        </div>
        <div v-if="!waiting">
            <b-row>
                <b-col class="col-4">
                    <label for="showr" class="search-bar">{{
                        $t('home.show')
                    }}</label>
                </b-col>
            </b-row>
            <div>
                <b-button-group class="btns-groups">
                    <b-button :to="`/editions/${edition.id}/artefacts`"
                        >Artefacts {{ artefactsLength }}</b-button
                    >
                    <b-button :to="`/editions/${edition.id}/imaged-objects`"
                        >Imaged Objects {{ imagedObjectsLength }}</b-button
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
    </div>
</template>

<script lang="ts">
import Vue from 'vue';
import EditionSidebar from './components/sidebar.vue';
import { EditionInfo } from '@/models/edition.js';
import Waiting from '@/components/misc/Waiting.vue';

export default Vue.extend({
    name: 'edition-version',
    components: {
        EditionSidebar,
        Waiting,
    },
    data() {
        return {
            editionId: 0,
            page: '',
        };
    },
    computed: {
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

<style lang="scss" scoped>
@import '@/assets/styles/_variables.scss';
@import '@/assets/styles/_fonts.scss';
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
</style>
