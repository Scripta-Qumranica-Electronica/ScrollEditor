<template>
    <div>
        <router-link
            class="card-decoration"
            :to="{ path: `/editions/${edition.id}` }"
        >
            <b-row>
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
                            <edition-icons :edition="edition" />
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
        </router-link>
        <div
            class="
                mt-2
                mr-1 mr-xl-0
                pr-0
                pl-0
                ml-xl-4 ml-lg-1 ml-md-1 ml-sm-0 ml-xs-0
            "
        >
            <b-button
                v-if="user"
                @click="editionCopyClick()"
                variant="primary"
                class="
                    direction
                    ml-xl-5 ml-lg-0 ml-md-1 ml-sm-0 ml-xs-0
                    mr-1 mr-lg-0 mr-md-1 mr-sm-0 mr-xs-0
                "
                >{{ $t('misc.copy') }}
            </b-button>
        </div>
    </div>
</template>

<script lang="ts">
import { Component, Emit, Prop, Vue } from 'vue-property-decorator';
import { EditionInfo } from '@/models/edition';
import EditionIcons from '@/components/cues/edition-icons.vue';
import EditionService from '@/services/edition';

@Component({
    name: 'edition-public-card',
    components: { EditionIcons },
})
export default class EditionPublicCard extends Vue {
    @Prop() public edition!: EditionInfo;

    private editionService: EditionService = new EditionService();

    private get thumbnailSource(): string | undefined {
        return this.edition?.thumbnail?.thumbnailUrl;
    }

    private get user(): boolean {
        return this.$state.session.user ? true : false;
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
