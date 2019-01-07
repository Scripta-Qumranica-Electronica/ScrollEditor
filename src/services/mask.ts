import { Store } from 'vuex';
import { Communicator, CopyCombinationResponse, ServerError } from './communications';
import { ScrollInfo, ScrollVersionInfo } from '@/models/scroll';
import { Fragment } from '@/models/fragment';

class MaskService {
    private communicator: Communicator;
    constructor(private store: Store<any>) {
        this.communicator = new Communicator(this.store);
    }

    public setMask(mask: string) {
        this.store.dispatch('mask/setMask', mask);
        console.log('set mask, mask=', mask);
    }
}

export default MaskService;
