import { Store } from 'vuex';
import axios, { AxiosResponse } from 'axios';
import { authHeader } from '../store/session';
import { ImagedObjectSimple } from '@/models/imagedObject';

// export interface ValidateSessionResponse {
//     SESSION_ID: string;
//     USER_ID: number;
// }

export interface ValidateTokenResponse {
    TOKEN: string;
    USER_ID: number;
}

export interface Login {
    userName: string;
    password: string;
    userId: number;
    token: string;
}

export interface LoginResponse {
    userId: number;
    userName: string;
    token: string;
}

export interface CopyCombinationResponse {
    new_scroll_id: number;
}

export interface ListResults<T> {
    result: T[];
}

export interface Editions<T> {
    others: T[];
    primary: T;
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
    private requestOptions = {
        headers: authHeader()
    };

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

    public async postRequest<T>(transactionType: string, url: string, payload?: any): Promise<AxiosResponse<T>> {
        // const postRequestOptions = {
        //     headers: authHeader(),
        //     body: payload
        // };
        // TODO: add token to post request
        const response = await axios.post<T>(url, payload); // postRequestOptions
        const data = response.data as any;
        if (data.TYPE === 'ERROR' || data.error) {
            throw new ServerError(response.data);
        }
        return response;
    }

    public async getRequest<T>(url: string): Promise<AxiosResponse<T>> {
        // const requestOptions = {
        //     headers: authHeader()
        // };

        const response = await axios.get<T>(url, this.requestOptions);
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
    // TODO - rermove this function
    public async listRequest(transactionType: string, payload?: any): Promise<ListResults<any>> {
        try {
            const response = await this.request<ListResults<any>>(transactionType, payload);
            return response.data;
        } catch (err) {
            const serverError = err as ServerError;
            if (err && err.errorText === 'No results found.') {
                const empty: ListResults<string> = {
                    result: []
                };
                return empty;
            }
            throw err;
        }
    }

    public async getList(url: string, payload?: any): Promise<ListResults<any>> {
        // todo: add Promise<Editions<any> to get edition version:primary and other
        try {
            // debugger
            const response = await axios.get<any>(url, this.requestOptions);
            return response.data;
        } catch (err) {
            const serverError = err as ServerError;
            if (err && err.errorText === 'No results found.') {
                const empty: ListResults<string> = {
                    result: []
                };
                return empty;
            }
            throw err;
        }
    }

    public async getEdition(url: string): Promise<Editions<any>> {
        try {
            const response = await axios.get<any>(url, this.requestOptions);
            return response.data;
        } catch (err) {
            const serverError = err as ServerError;
            if (err && err.errorText === 'No results found.') {
                const empty: Editions<string> = {
                    primary: '',
                    others: [],
                };
                return empty;
            }
            throw err;
        }
    }

    public async copyEdition(url: string, name: string | undefined): Promise<any> {
        try {
            const response = await axios.post<any>(url, name ? {name} : {},  this.requestOptions);
            return response.data;
        } catch (err) {
            const serverError = err as ServerError;
            if (err && err.errorText === 'No results found.') {
                const empty: Editions<string> = {
                    primary: '',
                    others: [],
                };
                return empty;
            }
            throw err;
        }
    }

    public async renameEdition(url: string, name: string): Promise<any> {
        try {
            const response = await axios.put<any>(url, {name},  this.requestOptions);
            return response.data;
        } catch (err) {
            const serverError = err as ServerError;
            if (err && err.errorText === 'No results found.') {
                const empty: Editions<string> = {
                    primary: '',
                    others: [],
                };
                return empty;
            }
            throw err;
        }
    }

    public async getFragment(url: string): Promise<ImagedObjectSimple> {
        try {
            const response = await axios.get<any>(url, this.requestOptions);
            return response.data;
        } catch (err) {
            const serverError = err as ServerError;
            if (err && err.errorText === 'No results found.') {
                const empty: ImagedObjectSimple = {} as ImagedObjectSimple;
                return empty;
            }
            throw err;
        }
    }
}
