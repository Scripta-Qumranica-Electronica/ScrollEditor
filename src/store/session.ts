import { SessionState, RootState } from './types';
import { MutationTree, ActionTree, Module } from 'vuex';

function getLocalStorageSession(): SessionState {
    const sessionState: SessionState = {
        userId: localStorage.getItem('userId') as (number | null) || undefined,
        loggedIn: localStorage.getItem('loggedIn') === 'true',
        userName: localStorage.getItem('userName') || undefined,
        token: localStorage.getItem('token') || undefined,
        activated: localStorage.getItem('activated') === 'true'
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

    setEntry('userId', String(state.userId));
    setEntry('loggedIn', state.loggedIn ? 'true' : 'false');
    setEntry('userName', state.userName);
    setEntry('token', state.token);
    setEntry('activated', state.activated ? 'true' : 'false');
}

const userState = getLocalStorageSession();

const mutations: MutationTree<SessionState> = {
    SET_LOGGED_IN(state, { userId, userName, token, activated }) {
        state.loggedIn = true;
        state.userId = userId;
        state.userName = userName;
        state.token = token;
        state.activated = activated;
    },

    SET_LOGGED_OUT(state) {
        state.loggedIn = false;
        state.userId = undefined;
        state.userName = undefined;
        state.token = undefined;
        state.activated = undefined;
    }
};


const actions: ActionTree<SessionState, RootState> = {
    logIn({ commit, state }, { userId, userName, token, activated }) {
        commit('SET_LOGGED_IN', { userId, userName, token, activated });
        setLocalStorageSession(state);
    },

    logOut({ commit, state }) {
        commit('SET_LOGGED_OUT');
        setLocalStorageSession(state);
    },
};

export function authHeader() {
    if (userState.loggedIn) {
        return {Authorization: 'Bearer ' + userState.token };
    } else {
        return {};
    }
}

const store: Module<SessionState, RootState> = {
    namespaced: true,
    state: userState,
    mutations,
    actions,
};

export default store;
