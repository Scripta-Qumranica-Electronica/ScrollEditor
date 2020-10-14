<template>
    <div>
        <div
            v-if="editions.length"
            :class="{afterlogin: this.editions.length > 0 }"
            >
            <b-card
                class="p-3"
                 no-body
                v-for="edition in editions"
                :key="edition.versionId"
            >
                <edition-public-card :edition="edition"></edition-public-card>
            </b-card>
        </div>
    </div>
</template>       

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import { EditionInfo } from '@/models/edition';
import EditionIcons from '@/components/cues/edition-icons.vue';
import Waiting from '@/components/misc/Waiting.vue';
import EditionPublicCard from './EditionPublicCard.vue';

@Component({
    name: 'editions-public-list',
    components: { 
        Waiting,
        EditionPublicCard,
     },
})
export default class EditionsPublicList extends Vue {
    @Prop(
    ) public editions!: EditionInfo[];
}
</script>

<style  lang="scss" scoped>
@import '@/assets/styles/_variables.scss';
@import '@/assets/styles/_fonts.scss';

.text-edition .card {
    display: inline-block;
    width: calc(25% - 20px);
    margin: 10px;
}

</style>
