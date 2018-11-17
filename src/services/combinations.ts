import { Store } from 'vuex';
import { Communicator, ListResults } from './communications';
import Combination from '@/models/combination';
import { AllScrollState } from '@/store/types';
import Scroll from '@/models/scroll';

class CombinationsService {
    private static combinationsAlreadyLoaded = false;

    private communicator: Communicator;
    private allScrollsState: AllScrollState;

    constructor(private store: Store<any>) {
        this.communicator = new Communicator(this.store);
        this.allScrollsState = this.store.state.allScrolls;
    }

    public async fetchAllCombinations(reload = false): Promise<void> {
        if (!reload && CombinationsService.combinationsAlreadyLoaded) {
            return;
        }

        CombinationsService.combinationsAlreadyLoaded = false;
        const response = await this.communicator.request<ListResults<any>>('getCombs');
        console.log(response);

        // Take all the combinations returned by the server and split them into combinations and scrolls
        const combinations = response.data.results.map((obj) => new Combination(obj));
        const scrolls: { [name: string]: Scroll } = {};

        for (const combination of combinations) {
            if (!(combination.name in scrolls)) {
                scrolls[combination.name] = new Scroll(name);
            }
            const scroll = scrolls[combination.name];
            combination.scroll = scrolls[combination.name];
            if (combination.userId === 1) {
                scroll.defaultCombination = combination;
            }
        }

        this.store.dispatch('allScrolls/setAllScrolls', {
            combinations,
            scrolls,
        }, { root: true });

        CombinationsService.combinationsAlreadyLoaded = true;
    }
}

export default CombinationsService;
