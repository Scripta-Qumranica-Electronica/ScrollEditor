import { EditionInfo, AllEditions } from '@/models/edition';
import { CommHelper } from './comm-helper';
import { EditionListDTO, EditionUpdateRequestDTO, EditionDTO } from '@/dtos/sqe-dtos';
import { StateManager } from '@/state';
import { ApiRoutes } from '@/variables';
import { Requests } from './requests';

class EditionService {
    public stateManager: StateManager;

    constructor() {
        this.stateManager = StateManager.instance;
    }

    public async getAllEditions(): Promise<AllEditions> {
        const response = await CommHelper.get<EditionListDTO>(ApiRoutes.allEditionsUrl());
        const editionList = [] as EditionInfo[];
        const myEditionList = [] as EditionInfo[];
        const self = this;

        response.data.editions.map((obj) => { // group
            const publicEditions = obj.filter((element) => element.isPublic);

            if (StateManager.instance.session.user) {
                const myEditions = obj.filter((element) =>
                    element.owner.userId === self.stateManager.session.user!.userId);

                if (myEditions.length) {
                    myEditionList.push(new EditionInfo(myEditions[0]));
                    // TODO: add myCount.length or shares length ?
                }
            }
            if (publicEditions.length) {
                const editionInfo = new EditionInfo(publicEditions[0]);
                editionInfo.publicCopies = publicEditions.length; // update number of public scrolls
                editionList.push(editionInfo);
            }
        });

        this.stateManager.editions.items = editionList;
        return {editionList, myEditionList} as AllEditions;
    }

    public async getEdition(editionId: number, ignoreCache = false): Promise<EditionInfo> {
        // Fetches a edition version from the server and puts it in the store.
        // Returns immediately if the requested edition version is already in the store
        if (!ignoreCache &&
            this.stateManager.editions.current &&
            this.stateManager.editions.current.id === editionId) {
            return this.stateManager.editions.current;
        }

        this.stateManager.editions.current = undefined; // Trigger a spinner on all views
        const primary = await Requests.requestEdition(editionId);
        this.stateManager.editions.current = primary;

        return primary;
    }

    public async copyEdition(editionId: number, name: string): Promise<EditionInfo> {
        const dto = {
            name
        } as EditionUpdateRequestDTO;
        const response = await CommHelper.post<EditionDTO>(ApiRoutes.editionUrl(editionId), dto);

        const newEdition = new EditionInfo(response.data);
        return newEdition;
    }

}

export default EditionService;
