<template>
<div>
    <router-link
        class="cart-decoration"
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
                    <p class="card-font cart-title">
                        {{ edition.name }}
                        <edition-icons :edition="edition" />
                    </p>
                    <div>
                        <p class="card-font card-label">
                            Image:
                            <span class="card-font card-date">{{}}</span>
                        </p>
                        <p class="card-font card-label">
                            By:
                            {{ edition.owner.foreName }}
                        </p>
                    </div>
                    
                </div>
            </b-col>
        </b-row>
        </router-link>
        <div class="mt-2">
                        <b-button
                            v-if="user"
                            @click="openCopyModal($event)"
                            variant="primary"
                            class="direction"
                            >{{ $t('misc.copy') }}</b-button
                        >
                    </div>
        <b-modal
            id="copyModal"
            ref="copyModalRef"
            :title="
                $t('home.copyTitle', {
                    name: edition.name,
                    owner: edition.owner.forename,
                })
            "
            @ok="copyModalShown"
            :ok-title="$t('misc.copy')"
            :cancel-title="$t('misc.cancel')"
            :ok-disabled="waiting || !canCopy"
            :cancel-disabled="waiting"
        >
            <form @submit.stop.prevent="copyEdition">
                <b-form-group
                    :label="$t('home.newEditionName')"
                    label-for="newCopyName"
                    :description="$t('home.newEditionDesc')"
                >
                    <b-form-input
                        ref="newCopyName"
                        id="newName"
                        v-model="newCopyName"
                        type="text"
                        @keyup.enter="copyEdition"
                        required
                        :placeholder="$t('home.newEditionName')"
                    ></b-form-input>
                </b-form-group>
                <p v-if="waiting">
                    {{ $t('home.copyingEdition') }}...
                    <font-awesome-icon icon="spinner" spin></font-awesome-icon>
                </p>
                <p class="text-danger" v-if="errorMessage">
                    {{ errorMessage }}
                </p>
            </form>
        </b-modal>
        </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
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
    public newCopyName: string = '';
    public errorMessage: string = '';
    public waiting: boolean = false;

    private get thumbnailSource(): string | undefined {
        return this.edition.thumbnail
            ? this.edition.thumbnail.thumbnailUrl
            : undefined;
    }

    public get user(): boolean {
        return this.$state.session.user ? true : false;
    }

    public get canCopy(): boolean {
            return this.newCopyName.trim().length > 0;
    }

    public  copyModalShown() {
            this.newCopyName = this.edition!.name;
            (this.$refs.newCopyName as any).focus();
     }

     public openCopyModal(evt: Event) {
         this.$bvModal.show('copyModal');
     }

    public async copyEdition(evt: Event) {
            evt.preventDefault();

            if (!this.canCopy) {
                return; // ENTER key calls this handler even if the button is disabled
            }
            this.newCopyName = this.newCopyName.trim();

            this.waiting = true;
            this.errorMessage = '';
            try {
                const newEdition = await this.editionService.copyEdition(
                    this.edition!.id,
                    this.newCopyName
                );

                this.$state.misc.newEditionId = newEdition.id;

                this.$router.push({
                    path: `/editions/${newEdition.id}`
                });
                (this.$refs.copyModalRef as any).hide();
            } catch (err) {
                this.errorMessage = err;
            } finally {
                this.waiting = false;
            }
        }
}
</script>

<style lang="scss" scoped>
@import '@/assets/styles/_variables.scss';
@import '@/assets/styles/_fonts.scss';
.direction{
        margin-left: 90px;
}
.cart-title {
    font-weight: $font-weight-3 !important;
    color: $black;
    margin-bottom: 1px;
}

.cart-decoration:hover {
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
