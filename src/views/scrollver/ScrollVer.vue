<template>
    <div>
        <div v-if="waiting" class="row"><div class="col"><waiting></waiting></div></div>
        <div v-if="!waiting" class="row">
            <div class="col" v-if="waiting"><waiting></waiting></div>
            <div class="col">
                <p>Info for scroll {{ currentVersionId }}</p>
                <!-- Main display goes here -->
            </div>
            <div class="col-xl-2 col-lg-3 col-md-4">
                <scroll-ver-sidebar v-if="!waiting" :versions="scrollVersions" :current="currentVersion" :isNew="isNew"/>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import Vue from 'vue';
import ScrollVerSidebar from './components/sidebar.vue';
import ScrollService from '@/services/scroll';
import { ScrollVersionInfo } from '@/models/scroll.ts';
import Waiting from '@/components/misc/Waiting.vue';

export default Vue.extend({
    name: 'scroll-version',
    components: {
        ScrollVerSidebar,
        Waiting,
    },
    data() {
        return {
            scrollService: new ScrollService(this.$store),
            scrollVersions: [] as ScrollVersionInfo[],
            currentVersion: undefined as ScrollVersionInfo | undefined,
            waiting: false,
        };
    },
    computed: {
        currentVersionId(): number {
            return parseInt(this.$route.params.id, 10);
        },
        isNew(): boolean {
            return this.$route.params.new==='new';
        }
    },
    mounted() {
        this.loadInfo();
    },
    beforeRouteUpdate(to, from, next) {
        this.loadInfo();
        next();
    },
    methods: {
        async loadInfo() {
            this.waiting = true;
            try {
                this.scrollVersions = await this.scrollService.getScrollVersions(this.currentVersionId);
                this.currentVersion = this.scrollVersions.find((sv) => sv.versionId === this.currentVersionId);
            } finally {
                this.waiting = false;
            }
        }
    },
});
</script>

<style lang="scss" scoped>
</style>
