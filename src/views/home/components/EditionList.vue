<template>

    <div>
        <p v-b-toggle="title">
            
             <i class="toggle-icon fa fa-angle-down"/>{{ title }}</p>
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
    transform: rotate(-90deg);
}

.toggle-icon {
    color: $blue;
    margin-left: 5px;
}

p:focus {
    outline: 0;
}

.text-edition .card {
    display: inline-block;
    width: calc(25% - 20px);
    margin: 10px;
}

</style>
