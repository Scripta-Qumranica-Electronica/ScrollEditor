<template>
    <div class="card">
        <router-link tag="a" :to="{  path:`/editions/${edition.id}` }">
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
            <router-link tag="div" :to="{  path:`/editions/${edition.id}` }">
                <h5 class="cart-title">
                    {{ edition.name }}
                    <edition-icons :edition="edition"/>
                </h5>
                
                <!--  <p v-if="shareCount">
          <b-btn v-b-popover.hover="shareNames" title="Shares" class="share">
            <span class="badge badge-info mr-1">{{ shareCount }}</span>{{ $tc('home.shares', shareCount)}}
          </b-btn>
                </p>-->
            </router-link>
        </div>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import { EditionInfo } from '@/models/edition';
import EditionIcons from '@/components/cues/edition-icons.vue';

@Component({
    name: 'edition-version-card',
    components: { 'edition-icons': EditionIcons },
})
export default class EditionVersionCard extends Vue {
    @Prop() public edition!: EditionInfo;

    // data() becomes data members
    //
    // data {
    //        return {
    //          element: 5;
    //      }
    // }
    //
    // private element = 5;

    // Computed becomes getters
    //   private get lockEdition(): EditionInfo[] {
    //         return this.$state.editions.items.filter(
    //             ed => ed.permission.readOnly
    //         );
    //     }
    private get thumbnailSource(): string | undefined {
        return this.edition.thumbnail
            ? this.edition.thumbnail.thumbnailUrl
            : undefined;
    }
    private get lockEdition(): boolean {
        return this.edition.permission.readOnly;
    }

    private get shareCount(): number {
        return this.edition.shares.length - 1; // One is the current user
    }

    private get shareNames(): string {
        const names = this.edition.shares.map(share => share.email);
        return names.join(', ');
    }
}
</script>

<style lang="scss" scoped>
@import '@/assets/styles/_variables.scss';
.card:hover,
.list-item .card:hover {
    transform: scale(0.95, 0.95);
    box-shadow: 5px 5px 20px 5px rgba(0, 0, 0, 0),
        -5px -5px 20px 5px rgba(0, 0, 0, 0.22);
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

.share {
    color: $black;
    background-color: white;
}
</style>