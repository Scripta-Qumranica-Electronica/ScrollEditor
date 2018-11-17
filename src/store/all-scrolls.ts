import { Module, MutationTree, ActionTree } from 'vuex';
import { AllScrollState, RootState } from './types';

const allScrollState: AllScrollState = {
    scrolls: [],
    combinations: [],
};

const mutations: MutationTree<AllScrollState> = {
    SET_ALL_SCROLLS(state, { scrolls, combinations }) {
        state.scrolls = scrolls;
        state.combinations = combinations;
    }
};

const actions: ActionTree<AllScrollState, RootState> = {
    setAllScrolls( { commit }, { scrolls, combinations }) {
        commit('SET_ALL_SCROLLS', { scrolls, combinations });
    }
};

const store: Module<AllScrollState, RootState> = {
    namespaced: true,
    state: allScrollState,
    mutations,
    actions,
};

export default store;
