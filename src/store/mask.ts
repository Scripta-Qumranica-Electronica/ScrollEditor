import { Module, MutationTree, ActionTree } from 'vuex';
import { RootState, MaskState } from './types';


const maskState: MaskState = {
    mask: null,
};


const mutations: MutationTree<MaskState> = {
    SET_MASK(state, mask) {
        state.mask = mask;
    },
};

const actions: ActionTree<MaskState, RootState> = {
    setMask(context, mask, reset = false) {
        context.commit('SET_MASK', mask);
        if (reset) {
            context.commit('scroll/RESET_DATA');
        }
    },
};

const store: Module<MaskState, RootState> = {
    namespaced: true,
    state: maskState,
    mutations,
    actions,
};

export default store;
