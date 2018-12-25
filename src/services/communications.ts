import { Store } from 'vuex';
import axios, { AxiosResponse } from 'axios';

export interface ValidateSessionResponse {
    SESSION_ID: string;
    USER_ID: number;
}

export interface CopyCombinationResponse {
    new_scroll_id: number;
}

export interface ListResults<T> {
    results: T[];
}

export interface DictionaryListResults<T> {
    results: { [key: string]: T };
}

export class ServerError extends Error {
    public type: string;
    public errorCode: number;
    public errorText: string;

    constructor(obj: any) {
        super(obj.ERROR_TEXT || obj.error || 'Server Error');
        this.type = obj.TYPE || '';
        this.errorCode = obj.ERROR_CODE || 0;
        this.errorText = obj.ERROR_TEXT || obj.error || '';
    }
}

export class NotFoundError extends Error {
    constructor(public entityType: string, public entityId: string) {
        super(`${entityType} ${entityId} not found`);
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
        const data = response.data as any;
        if (data.TYPE === 'ERROR' || data.error) {
            throw new ServerError(response.data);
        }

        return response;
    }

    // Helper method that returns a list, converting a server error saying there are no items into an empty
    // response.
    // We do not return a generic type because we usually don't bother providing an interface for the server
    // response, and need to convert it to your type. This conversion can't be done inside a generic function
    // in typescript (no way to call new T()), so it has to be done outside.
    public async listRequest(transactionType: string, payload?: any): Promise<ListResults<any>> {
        try {
            const response = await this.request<ListResults<any>>(transactionType, payload);
            return response.data;
        } catch (err) {
            const serverError = err as ServerError;
            if (err && err.errorText === 'No results found.') {
                const empty: ListResults<string> = {
                    results: []
                };
                return empty;
            }
            throw err;
        }

    }
}
