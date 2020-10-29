<template>
    <b-row v-if="edition">
        <b-col  class="col-2 pt-3">
            <div>
                <span class="name-edition"> {{ edition.name }} </span>
            </div>
            <div>
                <span class=""> </span>
            </div>
        </b-col>
        <b-col class="pt-3">
            <span
                >Last edit:
                <b>{{
                    edition.lastEdit ? edition.lastEdit.toDateString() : 'N/A'
                }}</b></span
            >
        </b-col>
        <b-col class="px-0 col-2 pt-3">
            <span>Status:</span>
            <b-badge
                :class="
                    edition.status === 'published'
                        ? ['status-badge', 'status-badge-published']
                        : ['status-badge', 'status-badge-draft']
                "
                >{{ edition.status ? 'Published' : 'Draft' }}</b-badge
            >
        </b-col>
        <b-col class="pt-2" h-align="end">
            <div>
                <b-button-group class="btns-groups">
                    <b-button
                        variant="outline-primary"
                        :to="`/editions/${edition.id}/artefacts/`"
                        >Artefacts</b-button
                    >
                    <b-button
                        variant="outline-primary"
                        :to="`/editions/${edition.id}/imaged-objects/`"
                        >Imaged Objects</b-button
                    >
                </b-button-group>
            </div>
        </b-col>
    </b-row>
</template>

<script lang="ts">
import { EditionInfo } from '@/models/edition';
import { Component, Vue } from 'vue-property-decorator';

@Component({
    name: 'edition-header',
    components: {},
})
export default class EditionHeader extends Vue {
    public get edition(): EditionInfo | undefined {
        return this.$state.editions.current!;
    }
}
</script>

<style lang="scss" scoped>
@import '@/assets/styles/_variables.scss';
@import '@/assets/styles/_fonts.scss';

.status-badge {
    font-family: $font-family;
    text-align: center;
    font-size: $font-size-1;
    width: 68px;
    height: 29.58px;
    line-height: 20px;
}

.status-badge-draft {
    background-color: $light-orange;
    color: $orange;
}

.status-badge-published {
    background-color: $light-greend;
    color: $green;
}
</style>