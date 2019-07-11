import Vue from 'vue';
import { ErrorDTO } from '@/dtos/error';

class ErrorService {

    constructor(private vue: Vue) {
    }

    public getErrorMessage(error: ErrorDTO): string {
        return 'Error: ' + error.msg;
    }
}

export default ErrorService;
