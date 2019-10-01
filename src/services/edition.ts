import { EditionInfo } from '@/models/edition';
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

    public async getAllEditions(): Promise<EditionInfo[]> {
        const response = await CommHelper.get<EditionListDTO>(ApiRoutes.allEditionsUrl());
        let editionList = [] as EditionInfo[];

        response.data.editions.map((grp) => {
            // grp is a group of editions - all versions of each other
            const editions = grp.map((obj) => new EditionInfo(obj));

            // Set various edition flags that depend on other editions
            const publicCopies = editions.filter((ed) => ed.isPublic).length;
            for (const edition of editions) {
                edition.mine = edition.owner.userId === this.stateManager.session.user!.userId;
                edition.otherVersions = editions.filter((ed) => ed !== edition);
                edition.publicCopies = publicCopies;
            }

            editionList = editionList.concat(editions);
        });

        return editionList;
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
