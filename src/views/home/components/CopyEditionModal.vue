<template>
    <b-modal
        v-if="currentEdition"
        id="copy-edition-modal"
        ref="copyModalRef"
        header-class="title-header"
        footer-class="title-footer"
        @shown="copyModalShown"
        @ok="copyEdition"
        :ok-disabled="waiting || !canCopy"
        :cancel-disabled="waiting"
    >
        <template v-slot:modal-header>
            <b-row class="mt-3">
                <b-col cols="12">
                    {{
                        $t('home.copyTitle', {
                            name: currentEdition.name,
                            owner: currentEdition.owner.forename,
                        })
                    }}</b-col
                >
            </b-row>
        </template>
        <form @submit.stop.prevent="copyEdition">
            <b-form-input
                ref="newCopyName"
                id="newName"
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
        <template v-slot:modal-footer>
            <div class="w-100">
                <b-button
                    @click="copyEdition"
                    block
                    variant="primary"
                    class="btn-login-modal"
                    :disabled="!newCopyName"
                >
                    {{ $t('misc.copy') }}
                    <span v-if="waiting">
                        <font-awesome-icon
                            icon="spinner"
                            spin
                        ></font-awesome-icon>
                    </span>
                </b-button>
            </div>
        </template>
    </b-modal>
</template>
<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import { EditionInfo } from '@/models/edition';
import EditionIcons from '@/components/cues/edition-icons.vue';
import EditionService from '@/services/edition';

@Component({
    name: 'copy-edition-modal',
})
export default class CopyEditionModal extends Vue {
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
        (this.$refs.newCopyName as any).focus();
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

            this.$state.misc.newEditionId = newEdition.id;

            this.$router.push({
                path: `/editions/${newEdition.id}`,
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