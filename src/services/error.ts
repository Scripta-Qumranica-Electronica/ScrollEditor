import type { ComponentPublicInstance } from 'vue';

interface ErrorDTO {
    msg: string;
}

class ErrorService {

    constructor(private vue: ComponentPublicInstance) {
    }

    public getErrorMessage(error: ErrorDTO): string {
        return 'Error: ' + error.msg;
    }
}

export default ErrorService;
