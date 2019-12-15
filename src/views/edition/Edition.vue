<template>
    <div class="wrapper">
        <div class="col-xl-2 col-lg-2 col-md-2" id="sidebar">
           <edition-sidebar :page="this.page" />
        </div>
        <div v-if="waiting" class="row">
            <div class="col"><waiting></waiting></div>
        </div>
        <div class="col-xl-10 col-lg-10 col-md-10">
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
import EditionService from '@/services/edition';
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
        }
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
        getPage(url: string) {
            if (url.endsWith('artefacts')) {
                this.page = 'artefacts';
            } else {
                this.page = 'imaged-objects';
            }
        }
    },
});
</script>

<style lang="scss" scoped>
#sidebar {
  min-width: 250px;
  max-width: 250px;
  float: left;
}

</style>
