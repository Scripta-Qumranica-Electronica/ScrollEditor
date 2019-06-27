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

    public static put<T>(url: string, body?: any, useCredentials: boolean = true) {
        return axios.put<T>(CommHelper.getFullUrl(url),
                            body, CommHelper.getRequestOptions(useCredentials));
    }

    public static post<T>(url: string, body?: any, useCredentials: boolean = true) {
        return axios.post<T>(CommHelper.getFullUrl(url),
                             body, CommHelper.getRequestOptions(useCredentials));
    }

    private static getRequestOptions(useCredentials: boolean) {
        if (useCredentials) {
            return {
                headers: authHeader()
            };
        } else {
            return undefined;
        }
    }

    private static getFullUrl(url: string) {
        if (url[0] !== '/') {
            url = '/' + url;
        }
        return process.env.VUE_APP_BACKEND_PREFIX + url;
    }
}
