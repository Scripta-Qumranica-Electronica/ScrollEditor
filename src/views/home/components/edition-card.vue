<template>
    <div class="edition-card-grid h-100" @click="editionEditClick()">
        <b-row>
            <b-col class="col col-4 col-lg-5 col-md-5 col-xs-6">
                <img
                    class="card-img-top"
                    v-if="thumbnailSource"
                    v-lazy="thumbnailSource"
                    :alt="edition.name"
                />
                <span v-else class="no-images">{{ $t('misc.noImages') }}</span>
            </b-col>
            <b-col class="col col-8 col-lg-7 col-md-6 col-xs-6">
                <p class="card-title">
                    {{ edition.name }}
                    <edition-icons :edition="edition" />
                </p>
            </b-col>
        </b-row>
        <div class="details-edition-personal-grid">
            <div class="status-edition-public-grid">
                <span class="card-label"> Edited: </span>
                <span
                    class="card-label card-date mr-1"
                    style="white-space: nowrap"
                    >{{
                        edition.lastEdit
                            ? edition.lastEdit.toDateString().substr(4)
                            : ''
                    }}
                </span>
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
            </div>
        </div>

        <b-row no-gutters style="align-items: end">
            <b-col class="col col-lg-12 col-xl-4 mb-md-1 mb-lg-1 mb-xl-0 mb-sm-1 mr-2">
                <b-button
                    class="btn btn-secondary btn-sm w-100"
                    size="sm"
                    @click="editionEditClick(); $event.stopPropagation();"
                    @contextmenu="editionEditRightClick"
                    v-b-tooltip.hover
                    title="Right-click to open in new tab"
                    >{{ $t('misc.edit') }}</b-button
                >
            </b-col>
            <b-col class="col-xl-7 col-lg-12">
                <b-button
                    class="btn btn-secondary btn-sm w-100"
                    size="sm"
                    @click="editionCopyClick(); $event.stopPropagation();"
                    >{{ $t('misc.copy') }}</b-button
                >
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

    private editionEditRightClick() {
        const editionLink = this.$router.resolve({ path: `/editions/${this.edition.id}` });
        window.open(editionLink.href);
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
    width: 4.5rem;
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
.edition-card-grid {
    display: grid;
    grid-gap: 5px;
    grid-template-rows: 0.5fr 1fr max-content;
}

.details-edition-personal-grid {
    display: grid;
    grid-gap: 10px;
    grid-template-columns: 0.6fr 1fr;
}
.status-edition-public-grid {
    grid-column: 2 / 2;
}
</style>
