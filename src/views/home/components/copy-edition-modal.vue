<template>
        <!-- :visible="currentEdition !== null &&  visible === true" -->
    <b-modal lazy
        v-if="currentEdition"
        v-model="internalVisible"
        :destroy-on-hide="true"
        id="copy-edition-modal"
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
        <template v-slot:header>
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
            <div v-if="currentEdition.copyright">
                <label>
                    Copy RightHolder {{currentEdition.copyright}}
                </label>
            </div>
            <div v-if="currentEdition.shares">
                <label>Collaborators {{currentEdition.shares}}</label>
            </div>
        </form>
        <div v-else>
            You must be registered and logged in before you can create a copy of an edition.
        </div>
        <template v-slot:footer>
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
import { Component, Prop, Vue, Watch, toNative } from 'vue-facing-decorator';
import type { BvTriggerableEvent } from 'bootstrap-vue-next';
import { EditionInfo } from '@/models/edition';
// import EditionIcons from '@/components/cues/edition-icons.vue';
import EditionService from '@/services/edition';
import { showModal } from '@/utils/modal-bus';

@Component({
    name: 'copy-edition-modal',
})
class CopyEditionModal extends Vue {
    @Prop() public modelValue!: boolean;

    public editionService: EditionService = new EditionService();
    public newCopyName: string = '';
    public errorMessage: string = '';
    public waiting: boolean = false;
    public internalVisible: boolean = false;

    @Watch('modelValue')
    onModelValueChanged(val: boolean) {
        this.internalVisible = val;
    }

    @Watch('internalVisible')
    onInternalVisibleChanged(val: boolean) {
        this.$emit('update:modelValue', val);
    }

    public get user(): boolean {
        return this.$state.session.user ? true : false;
    }

    public get isWaiting(): boolean {
        return  !this.currentEdition;
    }

    public get currentEdition(): EditionInfo | null {
        return this.$state.editions.current;
    }

    public get canCopy(): boolean {
        return this.newCopyName.trim().length > 0;
    }

    public copyModalShown() {
        this.newCopyName = this.currentEdition!.name;
        if (this.user) {
            (this.$refs.newCopyNameRef as any).focus();
        }
    }

    public onShow( bvModalevt: Event ) {
        bvModalevt.preventDefault();
    }

    public onHide(evt: Event | BvTriggerableEvent) {
      const trigger = 'trigger' in evt ? evt.trigger : evt.type;
      if ( trigger === 'backdrop') {
        // evt.preventDefault();
        (this.$refs.newCopyNameRef as any).blur();
        // Note: hide is handled by v-model internalVisible
      }
    }

    public async copyEdition(evt: Event | BvTriggerableEvent) {
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

            this.internalVisible = false;

            this.$router.push({
                path: `/editions/${this.$state.misc.newEditionId}`,
            });


            // force refresh of the new artefact page so that
            // \components\artefact\artefact-image.vue
            // in artefact-card.vue
            // async mounted() will be successfully fullfiled
            this.$router.go(0);

        } catch (err) {
            this.errorMessage = String(err);
            console.error('Error copying an edition!', err);
        } finally {
            this.waiting = false;
        }
    }

    public onLogin() {
        showModal('loginModal');
        this.internalVisible = false;
    }

    public onRegister() {
        showModal('registerModal');
        this.internalVisible = false;
    }
}
export default toNative(CopyEditionModal);
</script>
