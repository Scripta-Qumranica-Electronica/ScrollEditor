import { Module, MutationTree, ActionTree } from 'vuex';
import { EditionState, RootState } from './types';


const editionState: EditionState = {
    editionId: null,
    newEditionId: null,
    imagedObjects: null,
};


const mutations: MutationTree<EditionState> = {
    SET_EDITION_ID(state, editionId) {
        state.editionId = editionId;
    },

    SET_NEW_EDITION_ID(state, newEditionId) {
        state.newEditionId = newEditionId;
    },

    SET_IMAGED_OBJECTS(state, imagedObjects) {
        state.imagedObjects = imagedObjects;
    },

    RESET_DATA(state) {
        state.editionId = null;
        state.newEditionId = null;
        state.imagedObjects = null;
    }
};

const actions: ActionTree<EditionState, RootState> = {
    setEditionId(context, editionId) {
        context.commit('SET_EDITION_ID', editionId);
        context.commit('SET_IMAGED_OBJECTS', null);
    },

    setNewEditionId(context, newEditionId) {
        context.commit('SET_NEW_EDITION_ID', newEditionId);
    },

    setImagedObject(context, imagedObjects) {
        context.commit('SET_IMAGED_OBJECTS', imagedObjects);
    },

    resetData(context) {
        context.commit('RESET_DATA');
    },
};

const store: Module<EditionState, RootState> = {
    namespaced: true,
    state: editionState,
    mutations,
    actions,
};

export default store;
