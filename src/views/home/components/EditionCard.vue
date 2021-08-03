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
                    <span v-else class="no-images">{{ $t('misc.noImages') }}</span>
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
                                Edited:
                                </span>
                            </div>
                            <div>
                                <span class="card-label card-date mr-1">{{
                                    edition.lastEdit
                                        ? edition.lastEdit.toDateString().substr(4)
                                        : ''
                                }}
                                </span>
                            </div>
                        </b-row>
                        <b-row>

                            <p class="card-label ml-0 mr-9">
                                Status:
                                <b-badge
                                    :class="edition.isPublic ?
                                            [
                                                'status-badge',
                                                'status-badge-Published',
                                            ]:
                                            [
                                                'status-badge',
                                                'status-badge-draft'
                                            ]"
                                    >
                                    {{
                                        edition.isPublic ? 'Published' : 'Draft'
                                    }}
                                   </b-badge>
                            </p>

                        </b-row>

                </b-col>
            </b-row>
        </router-link>

        <div class="mt-2 mr-1 pr-0 pl-sm-0 pl-md-0 pl-xl-5 ml-xl-7 ml-lg-2 ml-md-3 ml-sm-2">
            <b-button
                v-if="user"
                @click="editionCopyClick()"
                variant="primary"
                class="direction mr-8 pr-8"
                >{{ $t('misc.copy') }}</b-button
            >
        </div>

    </div>
</template>

<script lang="ts">
import { Component, Prop, Emit, Vue } from 'vue-property-decorator';
import { EditionInfo } from '@/models/edition';
import EditionIcons from '@/components/cues/edition-icons.vue';


@Component({
    name: 'edition-card',
    components: { EditionIcons },
})
export default class EditionCard extends Vue {
    @Prop() private edition!: EditionInfo;

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

.status-badge {
    font-family: $font-family;
    text-align: center;
    font-size: $font-size-1;
    width: 3.5rem;
    /* width: 68px; */
    height: 29.58px;
    line-height: 20px;
}
.status-badge-draft {
    background-color: $light-orange;
    color: $orange;
}
.status-badge-Published {
    background-color: $light-greend;
    color: $green;
}
</style>
