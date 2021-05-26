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
                                Last edit:
                                <span class="card-font card-date">{{
                                    edition.lastEdit
                                        ? edition.lastEdit.toDateString()
                                        : 'N/A'
                                }}</span>
                            </p>
                            <p class="card-font card-label">
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
                        </div>
                    </div>
                </b-col>
            </b-row>
        </router-link>

        <div class="mt-2 ml-5 mr-0">
            <b-button
                v-if="user"
                @click.once="editionCopyClick()"
                variant="primary"
                class="direction"
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
.status-badge-Published {
    background-color: $light-greend;
    color: $green;
}
</style>
