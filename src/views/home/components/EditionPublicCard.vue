<template>
    <div>
        <router-link
            class="card-decoration"
            :to="{ path: `/editions/${edition.id}` }"
        >


            <b-row>
                <b-col class="col-4 col-xl-5 mr-xl-1">
                    <img
                        class="card-img-top"
                        v-if="thumbnailSource"
                        v-lazy="thumbnailSource"
                        :alt="edition.name"
                    />
                    <img
                        class="card-img-top"
                        v-else
                        src="@/assets/images/if_scroll_1375614.svg"
                        :alt="edition.name"
                    />
                </b-col>
                <b-col class="col-8 col-xl-6 col-lg-7 col-md-12 col-sm-12 ml-xl-0 ml-lg-1 ml-md-20 ml-sm-3 pl-md-1 pl-sm-0 mr-1 pr-1">

                    <b-row class="mt-xl-0 mt-lg-1 mt-md-0">
                        <p class="card-font card-title">
                            {{ edition.name }}
                            <edition-icons :edition="edition" />
                        </p>
                    </b-row>
                </b-col>
            </b-row>


            <b-row>
                <b-col class="col-4 col-xl-3 col-lg-2 col-sm-0 ">
                </b-col>
                <b-col class="col-8 col-xl-8 col-lg-10 col-md-12 col-sm-12 ml-md-2 ml-sm-0">
                    <b-row class="mt-2 custom-p-left">
                        <b-col class="col-12 ">
                            <span class="card-font card-label ">
                                Published:
                            </span>
                        </b-col>
                        <b-col class="col-12 ">
                            <span class="card-font card-label card-date ">{{
                                edition.lastEdit
                                    ? edition.lastEdit.toDateString().substr(4)
                                    : ''
                                }}
                            </span>
                        </b-col>
                    </b-row>
                </b-col>
            </b-row>



        </router-link>
        <div class="mt-2 mr-1 mr-xl-0 pr-0 pl-0 ml-xl-4 ml-lg-1 ml-md-1 ml-sm-0 ml-xs-0">
            <b-button
                v-if="user"
                @click.once="editionCopyClick()"
                variant="primary"
                class="direction ml-xl-5 ml-lg-0 ml-md-1 ml-sm-0 ml-xs-0 mr-1 mr-lg-0 mr-md-1 mr-sm-0 mr-xs-0"
                >{{ $t('misc.copy') }}
            </b-button >
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
.direction {
    margin-left: 90px;
}
.card-title {
    font-weight: $font-weight-3 !important;
    color: $black;
    margin-bottom: 1px;
}

.card-decoration:hover {
    text-decoration: none;
}
.card-font {
    font-style: $font-style;
    font-weight: $font-weight-1;
    font-size: $font-size-2;
    font-family: $font-family;

}
.card-label {
    color: $grey;
    margin-bottom: 0.1rem;
    /* margin-bottom: 1px; */
    margin-left: 0.1rem;

}
.card-date {
    color: $black;
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

.card-img-top {
    max-height: 2.6rem;
    max-width: 5rem;
}

</style>
