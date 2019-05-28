import { authHeader } from '@/store/session';
import axios from 'axios';
/*
 * This file provides handy utility functions for Axios transactions.
 */

export class CommHelper {
    public static get<T>(url: string, useCredentials: boolean = true) {
        return axios.get<T>(url, CommHelper.getRequestOptions(useCredentials));
    }

    public static put<T>(url: string, body?: any, useCredentials: boolean = true) {
        return axios.put<T>(url, body, CommHelper.getRequestOptions(useCredentials));
    }

    public static post<T>(url: string, body?: any, useCredentials: boolean = true) {
        return axios.post<T>(url, body, CommHelper.getRequestOptions(useCredentials));
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
}
