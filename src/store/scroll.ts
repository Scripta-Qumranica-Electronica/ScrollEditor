import { Module, MutationTree, ActionTree } from 'vuex';
import { ScrollState, RootState } from './types';


const scrollState: ScrollState = {
    scrollVersion: null,
    newScrollVersionId: null,
    fragments: null,
};


const mutations: MutationTree<ScrollState> = {
    SET_SCROLL_VERSION(state, scrollVersion) {
        state.scrollVersion = scrollVersion;
    },

    SET_NEW_SCROLL_VERSION_ID(state, newScrollVersionId) {
        state.newScrollVersionId = newScrollVersionId;
    },

    SET_FRAGMENTS(state, fragments) {
        state.fragments = fragments;
    }
};

const actions: ActionTree<ScrollState, RootState> = {
    setScrollVersion(context, scrollVersion) {
        context.commit('SET_SCROLL_VERSION', scrollVersion);
    },

    setNewScrollVersionId(context, newScrollVersionId) {
        context.commit('SET_NEW_SCROLL_VERSION_ID', newScrollVersionId);
    },

    setFragments(context, fragments) {
        context.commit('SET_FRAGMENTS', fragments);
    }
};

const store: Module<ScrollState, RootState> = {
    namespaced: true,
    state: scrollState,
    mutations,
    actions,
};

export default store;
