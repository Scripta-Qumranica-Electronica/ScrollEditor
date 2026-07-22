<template>
    <div>
        <b-modal
            v-model="visible"
            title="Report Problem"
            footer-class="title-footer"
            id="ReportProblemModal"
            aria-role="dialog"
            size="lg"
            @show="init"
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
                                    :disabled="reported"
                                ></b-form-input
                            ></b-col>
                        </b-row>
                        <b-row class="mb-2">
                            <b-col
                                ><b-form-input
                                    type="text"
                                    v-model="title"
                                    placeholder="Title"
                                    :disabled="reported"
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
                                    :disabled="reported"
                                ></b-form-textarea>
                            </b-col>
                        </b-row>
                    </b-col>
                </b-row>
            </form>
            <template v-slot:modal-footer>
                <b-button @click="reportProblem" :disabled="!readyToReport" v-if="!reported">
                    {{ $t('misc.report') }}
                </b-button>
                <span v-if="reported">Issue Reported</span>
                <b-button v-if="reported" @click="close">Close</b-button>
            </template>
        </b-modal>
    </div>
</template>

<script lang="ts">
import SessionService from '@/services/session';
import { Component, Vue, toNative } from 'vue-facing-decorator';

@Component({
    name: 'ReportProblemModal',
    components: {},
})
class ReportProblemModal extends Vue {
    public visible = false;
    public username: string = '';
    public description: string = '';
    public title = '';
    public reported = false;
    public sessionService: SessionService = new SessionService();

    public show() {
        this.visible = true;
    }

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
        const titleWithUserName = this.title + ' (' + actualUsername + ')';
        await this.sessionService.reportProblem({
            username: actualUsername,
            title: titleWithUserName,
            comment: this.description,
            url: window.location.toString(),
        });
        this.reported = true;
    }

    public close() {
        this.visible = false;
    }

    public init() {
        this.reported = false;
        this.username = '';
        this.title = this.$state.misc.reportIssueData?.title || '';
        this.description = this.$state.misc.reportIssueData?.description || '';
        this.$state.misc.reportIssueData = undefined;
    }
}
export default toNative(ReportProblemModal);
</script>
<style lang="scss" scoped>
@import '@/assets/styles/_variables.scss';
@import '@/assets/styles/_fonts.scss';
@import '@/assets/styles/_modals.scss';
</style>
