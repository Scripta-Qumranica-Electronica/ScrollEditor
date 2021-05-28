import Vue from 'vue';

interface ErrorDTO {
    msg: string;
}

class ErrorService {

    constructor(private vue: Vue) {
    }

    public getErrorMessage(error: ErrorDTO): string {
        return 'Error: ' + error.msg;
    }
}

export default ErrorService;
