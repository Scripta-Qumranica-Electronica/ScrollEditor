<template>
        <div>
            <b-tabs nav-wrapper-class="tabs">
                <b-tab
                    :title-item-class="'tab-title-class'"
                    :title="
                        $tc(
                            'home.personalEditionGroupCount',
                            personalEditionsCount
                        )
                    "
                    active
                >
                    <personal-editions
                        @on-personal-editions-load="onPersonalEditionsLoad($event)"
                    ></personal-editions>
                </b-tab>
                <b-tab
                    :title="$tc('home.publicEditionGroupCount', publicEditionsCount)"
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
import Vue from 'vue';
import Waiting from '@/components/misc/Waiting.vue';
import { EditionInfo } from '@/models/edition';
import PersonalEditions from './components/PersonalEditions.vue';
import PublicEditions from './components/PublicEditions.vue';

export default Vue.extend({
    name: 'home',
    components: {
        Waiting,
        PersonalEditions,
        PublicEditions
    },
    data() {
        return {
            filter: '',
            personalEditionsCount: 0,
            publicEditionsCount: 0,
        };
    },

    created() {
        this.$state.prepare.allEditions();

        this.$state.editions.current = undefined;
    },
    methods: {
        nameMatch(name: string): boolean {
            return name.toLowerCase().indexOf(this.filter.toLowerCase()) !== -1;
        },
        onPersonalEditionsLoad(count: number) {
            this.personalEditionsCount = count;
        },
        onPublicEditionsLoad(count: number) {
            this.publicEditionsCount = count;
        },
    },
});
</script>
<style lang="scss">
@import '@/assets/styles/_variables.scss';
@import '@/assets/styles/_fonts.scss';

.tab-pane{
    background: $backround-grey;
    padding:  0 15%;
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
    border-bottom: none!important;
    background-color: white;
    
}
.nav-tabs .tab-title-class > .nav-link.active,
.nav-tabs .tab-title-class > .nav-link.focus {
    color: $blue;
    border-bottom: 2px solid $blue;
    border-color: transparent transparent $blue;
}
</style>
