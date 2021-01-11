<template>
    <router-link
        :to="{ path: `/editions/${editionId}/artefacts/${artefact.id}` }"
    >
        <artefact-image
            class="card-img-top"
            v-if="artefact"
            :artefact="artefact"
            maxWidth="150"
        ></artefact-image>
        <label class="side-edition"
            >{{ artefact.name }} - {{ artefact.side }}</label
        >
    </router-link>
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


    // props
    @Prop() public readonly artefact!: Artefact
                        // Object as () => Artefact,
    
    // computed: 
    public get editionId(): number {
        return parseInt(this.$route.params.editionId);
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
</style>
