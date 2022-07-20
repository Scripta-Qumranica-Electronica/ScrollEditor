<template>
        <!-- :visible="currentEdition !== null &&  visible === true" -->
    <b-modal
        v-if="currentEdition"
        :visible="currentEdition !== null &&  visible === true"
        :destroy-on-hide="true"
        id="copy-edition-modal"
        ref="copyModalRef"
        header-class="title-header"
        footer-class="title-footer"
        @shown="copyModalShown"
        @ok="copyEdition"
        @hide="onHide"
        :ok-disabled="waiting || !canCopy"
        :cancel-disabled="waiting"
        :title-sr-only="true"
        :aria-label="$t('home.copyTitle', {
                            name: currentEdition.name,
                            owner: currentEdition.owner.forename,
                        })"
        aria-labelledby="copy-edition-modal"
    >
        <template v-slot:modal-header>
            <b-row class="mt-3">
                <b-col cols="12">
                    {{
                        $t('home.copyTitle', {
                            name: currentEdition.name,
                            owner: currentEdition.owner.forename || 'N/A',
                        })
                    }}</b-col
                >
            </b-row>
        </template>
        <form @submit.stop.prevent="copyEdition" v-if="user">
            <b-form-input
                ref="newCopyNameRef"
                id="newCopyName"
                v-model="newCopyName"
                type="text"
                @keyup.enter="copyEdition"
                required
                :placeholder="$t('home.newEditionName')"
            ></b-form-input>
            <p v-if="waiting">
                {{ $t('home.copyingEdition') }}...
                <font-awesome-icon icon="spinner" spin></font-awesome-icon>
            </p>
            <p class="text-danger" v-if="errorMessage">
                {{ errorMessage }}
            </p>
            <div v-if="currentEdition.copyrightHolder">
                <label>
                    Copy RightHolder {{currentEdition.copyrightHolder}}
                </label>
            </div>
            <div v-if="currentEdition.collaboators">
                <label>Collaborators {{edition.collaboators}}</label>
            </div>
        </form>
        <div v-else>
            You must be registered and logged in before you can create a copy of an edition.
        </div>
        <template v-slot:modal-footer>
            <b-row>
                <b-col>
                    <b-button
                        @click.once="copyEdition"
                        block
                        :disabled="!newCopyName"
                        v-if="user"
                    >
                        {{ $t('misc.copy') }}
                        <span v-if="waiting">
                            <font-awesome-icon
                                icon="spinner"
                                spin
                            ></font-awesome-icon>
                        </span>
                    </b-button>
                    <b-button @click="onLogin" class="mr-2" v-if="!user">
                        {{ $t('navbar.login') }}
                    </b-button>
                    <b-button @click="onRegister" v-if="!user">
                        {{ $t('navbar.register') }}
                    </b-button>
                </b-col>
            </b-row>
        </template>
    </b-modal>
</template>
<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import { EditionInfo } from '@/models/edition';
// import EditionIcons from '@/components/cues/edition-icons.vue';
import EditionService from '@/services/edition';

@Component({
    name: 'copy-edition-modal',
})
export default class CopyEditionModal extends Vue {
    @Prop() private visible!: boolean ;

    private editionService: EditionService = new EditionService();
    private newCopyName: string = '';
    private errorMessage: string = '';
    private waiting: boolean = false;

    private get user(): boolean {
        return this.$state.session.user ? true : false;
    }

    private get isWaiting(): boolean {
        return  !this.currentEdition;
    }

    private get currentEdition(): EditionInfo | null {
        return this.$state.editions.current;
    }

    private get canCopy(): boolean {
        return this.newCopyName.trim().length > 0;
    }

    private copyModalShown() {
        this.newCopyName = this.currentEdition!.name;
        if (this.user) {
            (this.$refs.newCopyNameRef as any).focus();
        }
    }

    private onShow( bvModalevt: Event ) {
        bvModalevt.preventDefault();
    }

    private onHide(evt: Event) {
      if ( evt.type === 'backdrop') {
        // evt.preventDefault();
        (this.$refs.newCopyNameRef as any).blur();
        (this.$refs.newCopyNameRef as any).hide();
      }
    }

    private async copyEdition(evt: Event) {
        evt.preventDefault();

        if (!this.canCopy) {
            return; // ENTER key calls this handler even if the button is disabled
        }
        this.newCopyName = this.newCopyName.trim();

        this.waiting = true;
        this.errorMessage = '';

        try {
            const newEdition = await this.editionService.copyEdition(
                this.currentEdition!.id,
                this.newCopyName
            );

            this.$state.editions.current = newEdition;

            this.$state.misc.newEditionId = newEdition.id;

            (this.$refs.copyModalRef as any).hide();

            this.$router.push({
                path: `/editions/${this.$state.misc.newEditionId}`,
            });


            // force refresh of the new artefact page so that
            // \components\artefact\artefact-image.vue
            // in artefact-card.vue
            // async mounted() will be successfully fullfiled
            this.$router.go(0);

        } catch (err) {
            this.errorMessage = err;
            console.error('Error copying an edition!', err);
        } finally {
            this.waiting = false;
        }
    }

    protected onLogin() {
        this.$root.$emit('bv::show::modal', 'loginModal');
        this.$bvModal.hide('copy-edition-modal');
    }

    protected onRegister() {
        this.$root.$emit('bv::show::modal', 'registerModal');
        this.$bvModal.hide('copy-edition-modal');
    }
}
</script>