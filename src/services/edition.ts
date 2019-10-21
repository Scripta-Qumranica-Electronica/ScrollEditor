import { EditionInfo } from '@/models/edition';
import { CommHelper } from './comm-helper';
import { EditionListDTO, EditionUpdateRequestDTO, EditionDTO, EditionGroupDTO } from '@/dtos/sqe-dtos';
import { StateManager } from '@/state';
import { ApiRoutes } from '@/services/api-routes';

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
                if (this.stateManager.session.user) {
                    edition.mine = edition.owner.userId === this.stateManager.session.user.userId;
                } else {
                    edition.mine = false;
                }
                edition.otherVersions = editions.filter((ed) => ed !== edition);
                edition.publicCopies = publicCopies;
            }

            editionList = editionList.concat(editions);
        });

        return editionList;
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
