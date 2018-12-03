<template>
    <div>
        <div v-if="waiting" class="row"><div class="col"><waiting></waiting></div></div>
        <div v-if="!waiting" class="row">
            <div class="col" v-if="waiting"><waiting></waiting></div>
            <div class="col" v-if="!waiting">
                <router-view></router-view>
            </div>
            <div class="col-xl-2 col-lg-3 col-md-4">
                <scroll-ver-sidebar/>
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
            currentVersionId: 0,
        };
    },
    computed: {
        currentVersion(): ScrollVersionInfo {
            return this.$store.state.scroll.scrollVersion;
        },
        waiting(): boolean {
            return !this.currentVersion;
        }
    },
    mounted() {
        this.currentVersionId = parseInt(this.$route.params.id, 10);
        this.loadInfo();
    },
    beforeRouteUpdate(to, from, next) {
        this.currentVersionId = parseInt(to.params.id, 10);
        this.loadInfo();
        next();
    },
    methods: {
        async loadInfo() {
            await this.scrollService.fetchScrollVersion(this.currentVersionId);
        }
    },
});
</script>

<style lang="scss" scoped>
</style>
