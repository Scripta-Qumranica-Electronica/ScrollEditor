import { Module, MutationTree, ActionTree } from 'vuex';
import { EditionState, RootState } from './types';


const editionState: EditionState = {
    edition: null,
    newEditionId: null,
    imagedObjects: null,
};


const mutations: MutationTree<EditionState> = {
    SET_EDITION(state, edition) {
        console.log('Mutation SET_EDITION called with ', edition);
        state.edition = edition;
    },

    SET_NEW_EDITION_ID(state, newEditionId) {
        state.newEditionId = newEditionId;
    },

    SET_IMAGED_OBJECTS(state, imagedObjects) {
        console.debug('Mutation SET_IMAGED_OBJECTS called with ', imagedObjects);
        state.imagedObjects = imagedObjects;
    },

    RESET_DATA(state) {
        state.edition = null;
        state.newEditionId = null;
        state.imagedObjects = null;
    }
};

const actions: ActionTree<EditionState, RootState> = {
    setEdition(context, edition) {
        console.debug('Action edition/SET_EDITION called with ', edition);
        context.commit('SET_EDITION', edition);
        context.commit('SET_IMAGED_OBJECTS', null);
    },

    setNewEditionId(context, newEditionId) {
        context.commit('SET_NEW_EDITION_ID', newEditionId);
    },

    setImagedObjects(context, imagedObjects) {
        console.debug('Action edition/setImagedObject called with ', imagedObjects);
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
