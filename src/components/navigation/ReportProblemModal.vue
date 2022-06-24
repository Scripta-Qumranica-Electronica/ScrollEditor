<template>
    <div>
        <b-modal
            title="Report Problem"
            footer-class="title-footer"
            ref="ReportProblemModalRef"
            id="ReportProblemModal"
            aria-role="dialog"
            size="lg"
        >
            <form>
                <b-row>
                    <b-col cols="12">
                        <b-row class="mb-2" v-if="!userNameExists">
                            <b-col
                                ><b-form-input
                                    type="text"
                                    v-model="username"
                                    placeholder="User Name"
                                ></b-form-input
                            ></b-col>
                        </b-row>
                        <b-row>
                            <b-col>
                                <b-form-textarea
                                    id="textarea"
                                    v-model="description"
                                    placeholder="Description Problem"
                                    rows="3"
                                    max-rows="6"
                                ></b-form-textarea>
                            </b-col>
                        </b-row>
                    </b-col>
                </b-row>
            </form>
            <template v-slot:modal-footer>
                <b-row>
                    <b-col>
                        <b-button @click="reportProblem">
                            {{ $t('misc.report') }}
                        </b-button>
                    </b-col>
                </b-row>
            </template>
        </b-modal>
    </div>
</template>

<script lang="ts">
import SessionService from '@/services/session';
import { Component, Prop, Emit, Vue } from 'vue-property-decorator';

@Component({
    name: 'ReportProblemModal',
    components: {},
})
export default class ReportProblemModal extends Vue {
    public username: string = '';
    public description: string = '';
    protected sessionService: SessionService = new SessionService();
    protected get userNameExists(): boolean {
        return undefined !== this.userName;
    }

    private get userName(): string | undefined {
        if (this.$state.session.user) {
            return (
                this.$state.session.user.forename +
                ' ' +
                this.$state.session.user.surname
            );
        }
        return undefined;
    }

    public async reportProblem() {
        await this.sessionService.reportProblem({
            username: this.username,
            description: this.description,
            url: window.location.toString(),
        });
    }
}
</script>
<style lang="scss" scoped>
@import '@/assets/styles/_variables.scss';
@import '@/assets/styles/_fonts.scss';
@import '@/assets/styles/_modals.scss';
</style>
