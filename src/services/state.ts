import { StateManager } from '@/state';
import EditionService from './edition';

/*
 * This service handles all the state data.
 *
 * It is responsible for preparing the state data, updating it (through SignalR notifications),
 * and taking care of multiple concurrent requests for the same piece of data.
 */

export default class StateService {
    private _state: StateManager;

    constructor() {
        this._state = StateManager.instance;
    }

    public async prepareAllEditions() {
        if (this._state.editions.items.length) {
            // Already prepared
            return;
        }

        const svc = new EditionService();
        const editions = await svc.getAllEditions();
        this._state.editions.items = editions;
    }
}
