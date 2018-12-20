import Vue from 'vue';
import Vuex, { StoreOptions } from 'vuex';

import language from './language';
import session from './session';
import scroll from './scroll';
import fragment from './fragment';
import { RootState } from './types';

Vue.use(Vuex);

const store: StoreOptions<RootState> = {
    modules: {
        language,
        session,
        scroll,
        fragment,
    }
};

export default new Vuex.Store<RootState>(store);
