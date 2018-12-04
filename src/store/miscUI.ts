import { Module, MutationTree, ActionTree } from 'vuex';
import { MiscUIState, RootState } from './types';


const miscUIState: MiscUIState = {
    newScrollVersionId: null,
};


const mutations: MutationTree<MiscUIState> = {
    SET_NEW_SCROLL_VERSION_ID: (state, payload: number | null) => {
        state.newScrollVersionId = payload;
    },
};

const actions: ActionTree<MiscUIState, RootState> = {
    setNewScrollVersionId(context, payload: number) {
        context.commit('SET_NEW_SCROLL_VERSION_ID', payload);
    },

    clearNewScrollVersionId(context) {
        context.commit('SET_NEW_SCROLL_VERSION_ID', null);
    }
};

const store: Module<MiscUIState, RootState> = {
    namespaced: true,
    state: miscUIState,
    mutations,
    actions,
};

export default store;
