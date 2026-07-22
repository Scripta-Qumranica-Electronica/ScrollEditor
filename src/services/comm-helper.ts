// import { authHeader } from '@/store/session';
import axios from 'axios';
import { StateManager } from '@/state';
/*
 * This file provides handy utility functions for Axios transactions.
 */

function authHeader() {
    if (StateManager.instance.session.token) {
        return {Authorization: 'Bearer ' + StateManager.instance.session.token };
    } else {
        return {};
    }
}

export class CommHelper {
    public static get<T>(url: string, useCredentials: boolean = true) {
        return axios.get<T>(CommHelper.getFullUrl(url),
                            CommHelper.getRequestOptions(useCredentials));
    }

    public static put<T>(url: string, body?: any, useCredentials: boolean = true, opId?: string) {
        return axios.put<T>(CommHelper.getFullUrl(url),
                            body, CommHelper.getRequestOptions(useCredentials, opId));
    }

    public static post<T>(url: string, body?: any, useCredentials: boolean = true) {
        return axios.post<T>(CommHelper.getFullUrl(url),
                             body, CommHelper.getRequestOptions(useCredentials));
    }

    public static delete(url: string, useCredentials: boolean = true) {
        return axios.delete(CommHelper.getFullUrl(url),
                            CommHelper.getRequestOptions(useCredentials));
    }

    private static getRequestOptions(useCredentials: boolean, opId?: string) {
        const headers: Record<string, string> = useCredentials ? { ...authHeader() } as Record<string, string> : {};
        if (opId) {
            // Correlation id so the server echoes it on the broadcast, letting the
            // reducer recognise this client's own change (opId reconciliation).
            headers['X-Operation-Id'] = opId;
        }
        return Object.keys(headers).length ? { headers } : undefined;
    }

    private static getFullUrl(url: string) {
        if (url[0] !== '/') {
            url = '/' + url;
        }
        return process.env.VUE_APP_BACKEND_PREFIX + url;
    }
}
