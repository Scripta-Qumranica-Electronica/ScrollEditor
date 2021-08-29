<template>
    <div>
        <b-row class="link-row" @click="editionViewClick()">
            <b-col class="col-4">
                <img
                    class="card-img-top"
                    v-if="thumbnailSource"
                    v-lazy="thumbnailSource"
                    :alt="edition.name"
                />
                <p class="no-images" v-else>{{
                    $t('misc.noImages')
                }}</p>
            </b-col>
            <b-col class="col-8">
                <b-row>
                    <p class="card-title">
                        {{ edition.name }}
                        <!-- public editions are all readonly and shared with everyone -->
                        <i v-b-tooltip.hover.bottom :title="$t('home.lock')" class="fa fa-lock ml-2"></i>
                    </p>
                </b-row>
                <b-row>
                    <div>
                        <span class="card-label">
                            Published:
                        </span>
                    </div>
                    <div>
                        <span class="card-label card-date mr-1"
                            >{{
                                edition.lastEdit
                                    ? edition.lastEdit
                                            .toDateString()
                                            .substr(4)
                                    : ''
                            }}
                        </span>
                    </div>
                </b-row>
            </b-col>
        </b-row>
        <b-row class="mt-2">
            <b-col>
                <b-button size="sm" @click="editionViewClick">{{
                    $t('misc.view')
                }}</b-button>
                <b-button class="ml-2" size="sm" @click="editionCopyClick()">{{
                    $t('misc.copy')
                }}</b-button>
            </b-col>
        </b-row>
    </div>
</template>

<script lang="ts">
import { Component, Emit, Prop, Vue } from 'vue-property-decorator';
import { EditionInfo } from '@/models/edition';
import EditionService from '@/services/edition';

@Component({
    name: 'edition-public-card',
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

.direction {
    margin-left: 90px;
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
