import { Module, MutationTree, ActionTree } from 'vuex';
import { FragmentState, RootState } from './types';


const fragmentState: FragmentState = {
    fragment: null,
    // artefacts: null,
};


const mutations: MutationTree<FragmentState> = {
    SET_FRAGMENT(state, fragment) {
        state.fragment = fragment;
    },
};

const actions: ActionTree<FragmentState, RootState> = {
    setFragment(context, fragment, reset = false) {
        context.commit('SET_FRAGMENT', fragment);
        if (reset) {
            context.commit('scroll/RESET_DATA');
        }
    },
};

const store: Module<FragmentState, RootState> = {
    namespaced: true,
    state: fragmentState,
    mutations,
    actions,
};

export default store;
