<template>
    <div>
        <b-tabs
            nav-wrapper-class="tabs-wrapper"
            v-model="activeTab"
            @activate-tab="onActivateTab"
        >
            <b-tab
                :disabled="!user"
                :title-item-class="'tab-title-class'"
                active
            >
                <template #title>
                    <span v-if="!editionsLoaded"
                        >{{ $t('home.personalEditions') }}
                        <b-spinner type="border" small
                    /></span>
                    <span v-else>{{
                        $tc(
                            'home.personalEditionGroupCount',
                            personalEditionsCount
                        )
                    }}</span>
                </template>
                <personal-editions
                    :search-value="searchValue"
                ></personal-editions>
            </b-tab>
            <b-tab :title-item-class="'tab-title-class'">
                <template #title>
                    <span v-if="!editionsLoaded"
                        >{{ $t('home.publicEditions') }}
                        <b-spinner type="border" small
                    /></span>
                    <span v-else>{{
                        $tc('home.publicEditionGroupCount', publicEditionsCount)
                    }}</span>
                </template>
                <public-editions :search-value="searchValue"></public-editions>
            </b-tab>
        </b-tabs>
    </div>
</template>

<script lang="ts">
// import Vue from 'vue';
import { Component, Prop, Emit, Vue, Watch } from 'vue-property-decorator';
import Waiting from '@/components/misc/Waiting.vue';
import { EditionInfo } from '@/models/edition';
import PersonalEditions from './components/personal-editions.vue';
import PublicEditions from './components/public-editions.vue';
import { Route } from 'vue-router';
import { SearchBarValue } from '@/components/search-bar.vue';
// import Search from '@/views/search/main.vue';
/* Shaindel: Add a Search tab, and a Search.vue component */

@Component({
    name: 'home',
    components: {
        Waiting,
        PersonalEditions,
        PublicEditions, // ,
        // Search
    },
})
export default class Home extends Vue {
    // component data
    // =====================

    private filter: string = '';
    private editionsLoaded = false;
    private activeTab: number = 0;
    private searchValue: SearchBarValue = {
        sort: 'lastEdit',
    };

    // hooks as constructor
    // ========================
    protected created() {
        this.$state.prepare.allEditions();
        this.$state.editions.current = null;
    }

    protected async mounted() {
        if (this.$route.params.editionType === 'public') {
            this.$nextTick(() => {
                this.activeTab = 1;
            });
        }

        if (this.$route.params.editionType === 'private' && !this.user) {
            this.$router.replace('/home/public');
        }

        await this.$state.prepare.allEditions(); // Already called in create, here we just wait for it to finish
        this.editionsLoaded = true;
    }

    public get user(): boolean {
        return this.$state.session.user ? true : false;
    }

    // methods & event handlers
    // ==================================

    public nameMatch(name: string): boolean {
        return name.toLowerCase().indexOf(this.filter.toLowerCase()) !== -1;
    }

    protected get personalEditionsCount() {
        return this.$state.editions.items.filter((ed) => !ed.isPublic).length;
    }

    protected get publicEditionsCount() {
        return this.$state.editions.items.filter((ed) => ed.isPublic).length;
    }

    protected onActivateTab(newTab: number, prevTab: number) {
        if (prevTab === -1) {
            return;
        }
        if (newTab === 0 && this.$route.params.editionType !== 'private') {
            this.$router.push('/home/private');
        } else if (
            newTab === 1 &&
            this.$route.params.editionType !== 'public'
        ) {
            this.$router.push('/home/public');
        }
    }

    @Watch('$route')
    protected onRouteChanged(to: Route, from: Route) {
        if (to.name !== 'home') {
            return; // Changed to some other page, ignore it.
        }

        if (to.params.editionType === 'public') {
            this.activeTab = 1;
        } else {
            this.activeTab = 0;
        }
    }
}
</script>

<style lang="scss">
@import '@/assets/styles/_variables.scss';
@import '@/assets/styles/_fonts.scss';
.tabs-wrapper {
    background: white;
    padding-top: 4px;

    .nav-tabs .nav-link.active,
    .nav-tabs .nav-item.show .nav-link {
        background-color: #e5e5e5;
        border-color: transparent;
    }
}
</style>

<style lang="scss" scoped>
@import '@/assets/styles/_variables.scss';
@import '@/assets/styles/_fonts.scss';

.tabs {
    background: $backround-grey;
    padding: 0 15%;
}

.tab-title-class > a.nav-link {
    font-family: $font-family;
    font-size: $font-size-2;
    font-style: $font-style;
    font-weight: $font-weight-3;
    text-align: left;
    color: $grey;
}
.nav-tabs {
    margin: 0 220px;
    border-bottom: none !important;
    background-color: white;
}
.nav-tabs .tab-title-class > .nav-link.active,
.nav-tabs .tab-title-class > .nav-link.focus {
    color: $blue;
    border-bottom: 2px solid $blue;
    border-color: transparent transparent $blue;
}
@media (max-width: 1360px) {
    .tabs {
        padding: 0 10%;
    }
}
</style>
