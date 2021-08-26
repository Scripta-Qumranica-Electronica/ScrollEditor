<template>
    <div>
        <b-tabs nav-wrapper-class="tabs" v-model="activeTab" @activate-tab="onActivateTab">
            <b-tab
                :disabled="!user"
                :title-item-class="'tab-title-class'"
                :title="
                    $tc('home.personalEditionGroupCount', personalEditionsCount)
                "
                active
            >
                <personal-editions
                    @on-personal-editions-load="onPersonalEditionsLoad($event)"
                ></personal-editions>
            </b-tab>
            <b-tab
                :title="
                    $tc('home.publicEditionGroupCount', publicEditionsCount)
                "
                :title-item-class="'tab-title-class'"
            >
                <public-editions
                    @on-public-editions-load="onPublicEditionsLoad($event)"
                ></public-editions>
            </b-tab>
        </b-tabs>
    </div>

</template>

<script lang="ts">
// import Vue from 'vue';
import { Component, Prop, Emit, Vue, Watch } from 'vue-property-decorator';
import Waiting from '@/components/misc/Waiting.vue';
import { EditionInfo } from '@/models/edition';
import PersonalEditions from './components/PersonalEditions.vue';
import PublicEditions from './components/PublicEditions.vue';
import { Route } from 'vue-router';
// import Search from '@/views/search/main.vue';
/* Shaindel: Add a Search tab, and a Search.vue component */


@Component({
  name: 'home',
  components: {
        Waiting,
        PersonalEditions,
        PublicEditions // ,
        // Search
  }
})

export default class Home extends Vue {

    // component data
    // =====================

    private filter: string = '';
    private personalEditionsCount: number = 0 ;
    private publicEditionsCount: number = 0 ;
    private activeTab: number = 0;

    // hooks as constructor
    // ========================
    protected created() {
        this.$state.prepare.allEditions();

        this.$state.editions.current = null;
    }

    protected mounted() {
        if (this.$route.params.editionType === 'public') {
            this.$nextTick(() => { this.activeTab = 1; });
        }

        if (this.$route.params.editionType === 'private' && !this.user) {
            this.$router.replace('/home/public');
        }
    }

    public get user(): boolean {
        return this.$state.session.user ? true : false;
    }

    // methods & event handlers
    // ==================================

    public nameMatch(name: string): boolean {
        return name.toLowerCase().indexOf(this.filter.toLowerCase()) !== -1;
    }

    // on-personal-editions-load emitted event handler
    public  onPersonalEditionsLoad(count: number) {
        this.personalEditionsCount = count;
    }


    // on-public-editions-load emitted event handler
    public  onPublicEditionsLoad(count: number) {
        this.publicEditionsCount = count;
    }

    protected onActivateTab(newTab: number, prevTab: number) {
        if (prevTab === -1) {
            return;
        }
        if (newTab === 0 && this.$route.params.editionType !== 'private') {
            this.$router.push('/home/private');
        } else if (newTab === 1 && this.$route.params.editionType !== 'public') {
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

.tab-pane {
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
</style>
