<template>

    <div>
        <p v-b-toggle="title">
            
             {{ title }} <i class="toggle-icon fa fa-angle-up"/></p>
         <b-collapse visible :id="title" class="mt-2">
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
                <edition-card :edition="edition"></edition-card>
            </b-card>
        </div>
          </b-collapse>
    </div>
</template>       

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import { EditionInfo } from '@/models/edition';
import EditionIcons from '@/components/cues/edition-icons.vue';
import Waiting from '@/components/misc/Waiting.vue';
import EditionCard from './EditionCard.vue';

@Component({
    name: 'editions-list',
    components: {
        Waiting,
        EditionCard,
     },
})
export default class EditionsList extends Vue {
    @Prop() public title!: string;
    @Prop(
    ) public editions!: EditionInfo[];
}
</script>

<style  lang="scss" scoped>
@import '@/assets/styles/_variables.scss';
@import '@/assets/styles/_fonts.scss';

.collapsed .toggle-icon {
    transform: rotate(180deg);
    color: $blue;

}

.not-collapsed .toggle-icon {
    transform: rotate(0deg);
    color: $blue;
}

.text-edition .card {
    display: inline-block;
    width: calc(25% - 20px);
    margin: 10px;
}

// NOTE: Bronson added this and it is probably not really good.
// There will be two edition-lists in the window, and one
// or the other may be collapsed.  The max height setting should
// be dependent upon whether only one or both edition-lists
// are opened.
.afterlogin {
    max-height: 35vh;
    overflow: auto;
}
</style>
