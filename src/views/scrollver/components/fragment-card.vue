<template>
    <div class="card">
        <img class="card-img-top" v-lazy="imageUrl" v-if="imageUrl" alt="Fragment Image">
    </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { Fragment } from '@/models/fragment';

export default Vue.extend({
    name: 'scroll-ver-fragments',
    props: {
        fragment: Fragment,
    },
    computed: {
        imageUrl(): string | undefined {
            if (this.fragment && this.fragment.recto && this.fragment.recto.color) {
                return this.fragment.recto.color.getThumbnailUrl(800);
            }
            return undefined;
        }
    }
});
</script>