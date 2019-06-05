import { ServerError, NotFoundError } from './communications';
import Vue from 'vue';

class ErrorService {

    constructor(private vue: Vue) {
    }

    public getErrorMsg(error: Error): string {
        const serverError = (error as ServerError);
        const notFoundError = (error as NotFoundError);

        if (serverError) {
            return this.vue.$t( `error.server ${serverError.errorCode}`).toString();
        }
        if (notFoundError) {
            return this.vue.$t(`notFound.${notFoundError.entityType}`, { id: notFoundError.entityId }).toString();
        }
        return this.vue.$t('error.server').toString();
    }

}

export default ErrorService;
