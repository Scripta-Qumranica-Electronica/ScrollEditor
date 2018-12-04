import Vue from 'vue';
import Vuex, { StoreOptions } from 'vuex';

import language from './language';
import session from './session';
import scroll from './scroll';
import { RootState } from './types';

Vue.use(Vuex);

const store: StoreOptions<RootState> = {
    modules: {
        language,
        session,
        scroll,
    }
};

export default new Vuex.Store<RootState>(store);
