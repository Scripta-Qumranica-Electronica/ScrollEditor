import { Store } from 'vuex';
import axios, { AxiosResponse } from 'axios';

export interface ValidateSessionResponse {
    SESSION_ID: string;
    USER_ID: number;
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

        return await axios.post<T>(this.url, body);
    }
}
