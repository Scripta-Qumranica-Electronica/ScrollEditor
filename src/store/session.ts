import { SessionState, RootState } from './types';
import { MutationTree, ActionTree, Module } from 'vuex';

function getLocalStorageSession(): SessionState {
    const sessionState: SessionState = {
        sessionId: localStorage.getItem('sessionId') || undefined,
        loggedIn: localStorage.getItem('loggedIn') === 'true',
        userName: localStorage.getItem('userName') || undefined,
        fullName: localStorage.getItem('fullName') || undefined,
    };

    return sessionState;
}

function setLocalStorageSession(state: SessionState) {
    function setEntry(key: string, value?: string) {
        if (value) {
            localStorage.setItem(key, value);
        } else {
            localStorage.removeItem(key);
        }
    }

    setEntry('sessionId', state.sessionId);
    setEntry('loggedIn', state.loggedIn ? 'true' : 'false');
    setEntry('userName', state.userName);
    setEntry('fullName', state.fullName);
}

const userState = getLocalStorageSession();

const mutations: MutationTree<SessionState> = {
    SET_LOGGED_IN(state, { sessionId, userName, fullName }) {
        state.loggedIn = true;
        state.sessionId = sessionId;
        state.userName = userName;
        state.fullName = fullName;
    },

    SET_LOGGED_OUT(state) {
        state.loggedIn = false;
        state.sessionId = undefined;
        state.userName = undefined;
        state.fullName = undefined;
    }
};


const actions: ActionTree<SessionState, RootState> = {
    logIn({ commit, state }, { sessionId, userName, fullName }) {
        commit('SET_LOGGED_IN', { sessionId, userName, fullName });
        setLocalStorageSession(state);
    },

    logOut({ commit, state }) {
        commit('SET_LOGGED_OUT');
        setLocalStorageSession(state);
    },
};

const store: Module<SessionState, RootState> = {
    namespaced: true,
    state: userState,
    mutations,
    actions,
};

export default store;
