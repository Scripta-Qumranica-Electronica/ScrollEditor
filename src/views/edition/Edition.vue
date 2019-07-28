<template>
    <div class="wrapper">
        <div class="col-xl-2 col-lg-3 col-md-4" id="sidebar">
           <edition-sidebar :page="this.page" />
        </div>
        <div v-if="waiting" class="row">
            <div class="col"><waiting></waiting></div>
        </div>
        <div class="col-xl-10 col-lg-9 col-md-8" id="fragments">
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
            editionService: new EditionService(),
            currentVersionId: 0,
            page: '',
        };
    },
    computed: {
        currentVersion(): EditionInfo | undefined {
            return this.$state.editions.current;
        },
        waiting(): boolean {
            return !this.currentVersion;
        }
    },
    mounted() {
        this.currentVersionId = parseInt(this.$route.params.id, 10);
        this.loadInfo();
        this.getPage(window.location.href);
    },
    beforeRouteUpdate(to, from, next) {
        this.currentVersionId = parseInt(to.params.id, 10);
        this.loadInfo();
        this.getPage(to.path);
        next();
    },
    methods: {
        async loadInfo() {
            await this.editionService.fetchEdition(this.currentVersionId);
        },
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

#fragments {
  float: right;
}
</style>
