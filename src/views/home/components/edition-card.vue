<template>
    <div>
        <b-row class="link-row" @click="editionEditClick()">
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
                        <span class="card-label"> Edited: </span>
                    </div>
                    <div>
                        <span class="card-label card-date mr-1"
                            >{{
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
                            :class="
                                edition.isPublic
                                    ? ['status-badge', 'status-badge-Published']
                                    : ['status-badge', 'status-badge-draft']
                            "
                        >
                            {{ edition.isPublic ? 'Published' : 'Draft' }}
                        </b-badge>
                    </p>
                </b-row>
            </b-col>
        </b-row>

        <b-row class="mt-2">
            <b-col>
                <b-button size="sm" @click="editionEditClick">{{
                    $t('misc.edit')
                }}</b-button>
                <b-button class="ml-2" size="sm" @click="editionCopyClick()">{{
                    $t('misc.copy')
                }}</b-button>
            </b-col>
        </b-row>
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

    private editionEditClick() {
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
.card-title {
    height: 50px;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;

    @supports (-webkit-line-clamp: 2) {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: initial;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
}
</style>
