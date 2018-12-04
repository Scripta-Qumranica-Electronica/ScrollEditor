import Vue from 'vue';
import Vuex, { StoreOptions } from 'vuex';

import language from './language';
import session from './session';
import miscUI from './miscUI';
import { RootState } from './types';

Vue.use(Vuex);

const store: StoreOptions<RootState> = {
    modules: {
        language,
        session,
        miscUI,
    }
};

export default new Vuex.Store<RootState>(store);
