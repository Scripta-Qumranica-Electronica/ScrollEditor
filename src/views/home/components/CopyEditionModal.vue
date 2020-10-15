<template>
           <b-modal
           v-if="edition"
            id="copy-edition-modal"
            ref="copyModalRef"
            :title="
                $t('home.copyTitle', {
                    name: edition.name,
                    owner: edition.owner.forename,
                })
            "
            @shown="copyModalShown"
            @ok="copyEdition"
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
</template>
<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import { EditionInfo } from '@/models/edition';
import EditionIcons from '@/components/cues/edition-icons.vue';
import EditionService from '@/services/edition';

@Component({
    name: 'copy-edition-modal'
})
export default class CopyEditionModal extends Vue {
    public editionService: EditionService = new EditionService();
    public newCopyName: string = '';
    public errorMessage: string = '';
    public waiting: boolean = false;

    public get user(): boolean {
        return this.$state.session.user ? true : false;
    }

    public get edition(): EditionInfo {
        return this.$state.editions.current!;
    }

    public get canCopy(): boolean {
        return this.newCopyName.trim().length > 0;
        }

    public  copyModalShown() {
            this.newCopyName = this.edition!.name;
            (this.$refs.newCopyName as any).focus();
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