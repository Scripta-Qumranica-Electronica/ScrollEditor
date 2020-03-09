<template>
    <div class="card">
        <router-link tag="a" :to="{ path:`/editions/${edition.id}` }">
            <!--TODO do not hardcode the image proxy server-->
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
        </router-link>
        <div class="card-body">
            <router-link tag="div" :to="{ path:`/editions/${edition.id}` }">
                <h5 class="cart-title">{{ edition.name }}</h5>
                <i
                    v-if="lockEdition"
                    v-b-tooltip.hover.bottom
                    :title="$t('home.lock')"
                    class="fa fa-lock"
                ></i>
                <p>
                    <span class="badge badge-info mr-1">{{ publicEditionCount }}</span>
                    {{ $tc('home.publicEditionCount',
                    publicEditionCount)}}
                </p>
                <p v-if="personalVersionCount">
                    <span class="badge badge-info mr-1">{{ personalVersionCount }}</span>
                    {{ $tc('home.personalVersionCount', personalVersionCount)}}
                </p>
                <p v-if="!personalVersionCount">&nbsp;</p>
            </router-link>
        </div>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Mixins } from 'vue-property-decorator';
import { EditionInfo } from '@/models/edition';

@Component({
    name: 'edition-card'
})
export default class EditionCard extends Vue {
    @Prop() public edition!: EditionInfo;

    private get lockEdition(): boolean {
        return this.edition.permission.readOnly;
    }
    private get thumbnailSource(): string | undefined {
        return this.edition.thumbnail
            ? this.edition.thumbnail.thumbnailUrl
            : undefined;
    }

    private get publicEditionCount(): number {
        return this.edition.publicCopies;
    }

    private get personalVersionCount(): number {
        return 0; // TODO: Return the actual number
    }
}
</script>

<style lang="scss" scoped>
.card:hover,
.list-item .card:hover {
    transform: scale(0.9, 0.9);
    box-shadow: 5px 5px 30px 15px rgba(0, 0, 0, 0),
        -5px -5px 30px 15px rgba(0, 0, 0, 0.22);
}

img.card-img-top {
    display: block;
    height: 100px;
    max-height: 100px;
    object-fit: cover;
}
h5 {
    cursor: pointer;
}
</style>