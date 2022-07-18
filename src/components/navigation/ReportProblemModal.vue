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
                        <b-row class="mb-2" v-if="!loggedIn">
                            <b-col
                                ><b-form-input
                                    type="text"
                                    v-model="username"
                                    placeholder="User Name"
                                ></b-form-input
                            ></b-col>
                        </b-row>
                        <b-row class="mb-2">
                            <b-col
                                ><b-form-input
                                    type="text"
                                    v-model="title"
                                    placeholder="Title"
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
                <b-row v-if="!reported">
                    <b-col>
                        <b-button @click="reportProblem" :disabled="!readyToReport">
                            {{ $t('misc.report') }}
                        </b-button>
                    </b-col>
                </b-row>
                <b-row v-if="reported">
                    <b-col cols="9">
                        Issue Reported
                    </b-col>
                    <b-col>
                        <b-button @click="close">Close</b-button>
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
    public title = '';
    public reported = false;
    protected sessionService: SessionService = new SessionService();

    public get readyToReport() {
        return (this.loggedIn || this.username.trim() !== '') && this.title.trim() !== '' && this.description.trim() !== '';
    }

    public get loggedIn() {
        return !!this.$state.session.user;
    }

    public async reportProblem() {
        let actualUsername = this.username;
        if (this.loggedIn) {
            actualUsername = this.$state.session.user?.email || '';
        }
        if (!actualUsername) {
            actualUsername = 'Not Specified';
        }

        await this.sessionService.reportProblem({
            username: actualUsername,
            title: this.title,
            comment: this.description,
            url: window.location.toString(),
        });
        this.reported = true;
    }

    public close() {
        (this.$refs.ReportProblemModalRef as any).hide();
    }
}
</script>
<style lang="scss" scoped>
@import '@/assets/styles/_variables.scss';
@import '@/assets/styles/_fonts.scss';
@import '@/assets/styles/_modals.scss';
</style>
