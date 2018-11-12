import { Store } from 'vuex';
import { Communicator, ListResults } from './communications';
import Combination from '@/models/combination';

class CombinationSearchService {
    private communicator: Communicator;
    constructor(private store: Store<any>) {
        this.communicator = new Communicator(this.store);
    }

    public async getAllCombinations(): Promise<Combination[]> {
        const response = await this.communicator.request<ListResults<any>>('getCombs');
        console.log(response);

        return response.data.results.map((obj) => new Combination(obj));
    }
}

export default CombinationSearchService;
