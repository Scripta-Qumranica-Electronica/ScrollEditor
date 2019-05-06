import { Module, MutationTree, ActionTree } from 'vuex';
import { ImagedObjectState, RootState } from './types';


const imagedObjectState: ImagedObjectState = {
    imagedObject: null,
    // artefacts: null,
};


const mutations: MutationTree<ImagedObjectState> = {
    SET_IMAGED_OBJECT(state, imagedObject) {
        state.imagedObject = imagedObject;
    },
};

const actions: ActionTree<ImagedObjectState, RootState> = {
    setImagedObject(context, imagedObject, reset = false) {
        context.commit('SET_IMAGED_OBJECT', imagedObject);
        if (reset) {
            context.commit('edition/RESET_DATA');
        }
    },
};

const store: Module<ImagedObjectState, RootState> = {
    namespaced: true,
    state: imagedObjectState,
    mutations,
    actions,
};

export default store;
