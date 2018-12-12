<template>
    <div>
        <div class="row" v-if="!fragments"><div class="col ml-auto"><Waiting></Waiting></div></div>
        <div v-if="fragments">
            <div class="row"><div class="col">
                <small>{{ $t('home.fragments') }}: {{ fragments.length }}</small>
            </div></div>
            <ul class="list-unstyled row mt-2"  v-if="fragments.length">
                <li class="col-md-12 col-lg-6 list-item"
                    v-for="fragment in fragments"
                    :key="fragment.id">
                    <fragment-card :fragment="fragment"></fragment-card>
                </li>
            </ul>
        </div>
    </div>
</template>

<script lang="ts">
import Vue from 'vue';
import Waiting from '@/components/misc/Waiting.vue';
import FragmentCard from './fragment-card.vue';
import { Fragment } from '@/models/fragment';
import ScrollService from '@/services/scroll';

export default Vue.extend({
    name: 'scroll-ver-fragments',
    data() {
        return {
            scrollService: new ScrollService(this.$store),
        };
    },
    components: {
        FragmentCard,
        Waiting,
    },
    computed: {
        fragments(): Fragment[] | null {
            return this.$store.state.scroll.fragments;
        }
    },
    mounted() {
        this.scrollService.fetchScrollVersionFragments()
    }
});
</script>