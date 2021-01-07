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
                        v-if="thumbnailSourceExists"
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
                <b-col class="col-8">
                    <div>
                        <p class="card-font card-title">
                            {{ edition.name }}
                            <edition-icons :edition="edition" />
                        </p>
                        <div>
                            <p class="card-font card-label">
                                Published At :
                                <span class="card-font card-date">{{
                                    edition.lastEdit
                                        ? edition.lastEdit.toDateString()
                                        : 'N/A'
                                }}</span>
                            </p>

                            <!-- <p class="card-font card-label">
                                By:
                                {{ edition.owner.foreName }}
                            </p> -->
                        </div>
                    </div>
                </b-col>
            </b-row>
        </router-link>
        <div class="mt-2">
            <b-button
                v-if="user"
                @click="editionCopyClick()"
                variant="primary"
                class="direction"
                >{{ $t('misc.copy') }}</b-button
            >
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
    public editionService: EditionService = new EditionService();
  
    private get thumbnailSourceExists(): boolean {
        return (undefined !== this.edition
                 && undefined !== this.edition.thumbnail ) ;
                 
    }

    private get thumbnailSource(): string | undefined {
        return (undefined !== this.edition.thumbnail)
            ? this.edition.thumbnail.thumbnailUrl
            : undefined;
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
    margin-bottom: 1px;
}
.card-date {
    color: $black;
}
</style>
