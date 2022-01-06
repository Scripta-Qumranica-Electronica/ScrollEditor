<template>
    <div class="edition-public-grid" @click="editionViewClick()">
        <div class="details-edition-public-grid">
            <img
                class="card-img-top"
                v-if="thumbnailSource"
                v-lazy="thumbnailSource"
                :alt="edition.name"
            />
            <p class="no-images" v-else>{{ $t('misc.noImages') }}</p>

            <p class="card-title">
                {{ edition.name }}
                <edition-icons :edition="edition" />
            </p>

            <div class="status-edition-public-grid">
                <span class="card-label"> Published: </span>

                <span class="card-label card-date mr-1"
                    >{{
                        edition.lastEdit
                            ? edition.lastEdit.toDateString().substr(4)
                            : ''
                    }}
                </span>
            </div>
        </div>
        <b-row no-gutters style="align-items: end">
            <b-col class="col col-lg-12 col-xl-4 mb-md-1 mb-lg-1 mb-xl-0 mb-sm-1 mr-2">
                <b-button
                    size="sm"
                    class="btn btn-secondary btn-sm w-100"
                    @click="editionViewClick(); $event.stopPropagation()"
                    >{{ $t('misc.view') }}</b-button
                >
            </b-col>
            <b-col class="col-xl-7 col-lg-12">
                <b-button
                    class="btn btn-secondary btn-sm w-100"
                    size="sm"
                    @click="editionCopyClick(); $event.stopPropagation()"
                    >{{ $t('misc.copy') }}</b-button
                >
            </b-col>
        </b-row>
    </div>
</template>

<script lang="ts">
import { Component, Emit, Prop, Vue } from 'vue-property-decorator';
import { EditionInfo } from '@/models/edition';
import EditionIcons from '@/components/cues/edition-icons.vue';

@Component({
    name: 'edition-public-card',
    components: { EditionIcons },
})
export default class EditionPublicCard extends Vue {
    @Prop() public edition!: EditionInfo;

    private get thumbnailSource(): string | undefined {
        return this.edition?.thumbnail?.thumbnailUrl;
    }

    private editionViewClick() {
        this.$router.push({ path: `/editions/${this.edition.id}` });
    }

    @Emit()
    private editionCopyClick() {
        return true;
    }
}
</script>

<style lang="scss" scoped>
@import '@/assets/styles/_variables.scss';
@import '@/assets/styles/_fonts.scss';
@import './card.scss';

.edition-public-grid {
    display: grid;
    grid-gap: 5px;
    grid-template-rows: 1fr 0.5fr;
}
.details-edition-public-grid {
    display: grid;
    grid-gap: 5px;
    grid-template-columns: 0.7fr 1fr;
}
.status-edition-public-grid {
    grid-column: 2 / 2;
    grid-row: 2 / 2;
}

.custom-p-left {
    padding-left: 1rem;
    @media (max-width: 1100px) {
        padding-left: 0;
    }
    @media (max-width: 768px) {
        padding-left: 0;
    }
}
</style>
