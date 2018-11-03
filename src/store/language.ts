import { StoreOptions, Module, MutationTree, ActionTree, GetterTree } from 'vuex';
import { LanguageState, RootState } from './types';

function getLocalStorageLanguage() {
    return localStorage.getItem('language') || 'en';
}

function setLocalStorageLanguage(language: string) {
    localStorage.setItem('language', language);
}

const languageState: LanguageState = {
    language: getLocalStorageLanguage(),
};

const getters: GetterTree<LanguageState, RootState> = {
    rtl: (state) => state.language === 'he' || state.language === 'ar',
};

const mutations: MutationTree<LanguageState> = {
    SET_LANGUAGE: (state, payload: string) => {
        state.language = payload;
    },
};

const actions: ActionTree<LanguageState, RootState> = {
    setLanguage(context, payload: string) {
        context.commit('SET_LANGUAGE', payload);
        setLocalStorageLanguage(payload);
    }
};

const store: Module<LanguageState, RootState> = {
    namespaced: true,
    state: languageState,
    mutations,
    getters,
    actions,
};

export default store;
