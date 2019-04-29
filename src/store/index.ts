import Vue from 'vue';
import Vuex, { StoreOptions } from 'vuex';

import language from './language';
import session from './session';
import edition from './edition';
import fragment from './fragment';
import { RootState } from './types';

Vue.use(Vuex);

const store: StoreOptions<RootState> = {
    modules: {
        language,
        session,
        edition,
        fragment,
    }
};

export default new Vuex.Store<RootState>(store);
