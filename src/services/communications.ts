import { Store } from 'vuex';
import axios, { AxiosResponse } from 'axios';

export interface ValidateSessionResponse {
    SESSION_ID: string;
    USER_ID: number;
}

export interface ListResults<T> {
    results: T[];
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
            ...payload
        };

        // Add session information
        if (this.store.state.session.sessionId) {
            body.SESSION_ID = this.store.state.session.sessionId;
            body.USER_ID = this.store.state.session.userId;
        } else {
            // Patch for the SQE API backend, which treats user 1 as an anonymous user
            body.USER_ID = 1;
        }

        const response = await axios.post<T>(this.url, body);
        if ((response.data as any).TYPE === 'ERROR') {
            throw new ServerError(response.data);
        }

        return response;
    }
}
