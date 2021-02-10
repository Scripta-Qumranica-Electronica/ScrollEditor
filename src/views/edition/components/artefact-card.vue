<template>
    <div id="card" ref="card">
        <router-link
            :to="{ path: `/editions/${editionId}/artefacts/${artefact.id}` }"
        >
            <artefact-image
                class="card-img-top"
                v-if="artefact && observed"
                :artefact="artefact"
                maxWidth="150"
            ></artefact-image>
            <img class="place-holder" v-if="artefact && !observed" src="@/assets/images/rings.svg"/>
            <label class="side-edition"
                >{{ artefact.name }} - {{ artefact.side }}</label
            >
        </router-link>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';

import { Artefact } from '@/models/artefact';
import ArtefactImage from '@/components/artefact/artefact-image.vue';

@Component({
    name: 'artefact-card',
    components: {
        ArtefactImage,
    }
})
export default class ArtefactCard extends Vue {
    @Prop() public readonly artefact!: Artefact;
    private observed = false;
    private intersectionObserver?: IntersectionObserver;

    private mounted() {
        this.intersectionObserver = new IntersectionObserver((entries) => this.onObserved(entries), {
            root: undefined,
            rootMargin: '0px',
            threshold: 0.1,
        });
        this.intersectionObserver.observe(this.$refs.card as Element);
    }

    private onObserved(entries: IntersectionObserverEntry[]) {
        if (entries.length !== 1) {
            console.warn("Intersection handler received numerous entries, 1 expected", entries);
        }

        const entry = entries[0];
        if (entry.isIntersecting) {
            this.observed = true;

            this.intersectionObserver!.disconnect();
            this.intersectionObserver = undefined;
        }
    }
    // computed:
    private get editionId(): number {
        return parseInt(this.$route.params.editionId);
    }

    private destroyed() {
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
            this.intersectionObserver = undefined;
        }
    }

}

</script>

<style lang="scss">
@import '@/assets/styles/_variables.scss';
@import '@/assets/styles/_fonts.scss';
div.card {
    margin-bottom: 20px;

    img {
        cursor: pointer;
    }
    .card-img-top svg {
        margin: 33px 33px 0px 33px;
        width: calc(92% - 33px);
    }
    .side-edition {
        width: 100%;
        text-align: center;
        font-style: $font-style;
        font-weight: $font-weight-3;
        font-size: $font-size-2;
        font-family: $font-family;
        color: $black;
    }
}

img.place-holder {
    width: 100%;
}

div#card {
    min-height: 60px;
}

</style>
