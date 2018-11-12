import { Store } from 'vuex';
import axios, { AxiosResponse } from 'axios';

export interface ValidateSessionResponse {
    SESSION_ID: string;
    USER_ID: number;
}

export class ServerError extends Error {
    public type: string;
    public errorCode: number;
    public errorText: string;

    constructor(obj: any) {
        super(obj.ERROR_TEXT || 'Server Error');
        this.type = obj.TYPE || '';
        this.errorCode = obj.ERROR_CODE || 0;
        this.errorText = obj.ERROR_TEXT || '';
    }
}

// Server communications
export class Communicator {
    private url = '/resources/cgi-bin/scrollery-cgi.pl';

    constructor(private store: Store<any>) { }

    public async request<T>(transactionType: string, payload?: any): Promise<AxiosResponse<T>> {
        const body = {
            transaction: transactionType,
            SESSION_ID: this.store.state.session.sessionId,
            ...payload
        };

        const response = await axios.post<T>(this.url, body);
        if ((response.data as any).TYPE === 'ERROR') {
            throw new ServerError(response.data);
        }

        return response;
    }
}
