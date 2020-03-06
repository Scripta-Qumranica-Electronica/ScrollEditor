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
        const prevEdition = this.stateManager.editions.find(editionId);

        if (!prevEdition) {
            throw new Error(`Can't copy non existing edition ${editionId}`);
        }

        const dto = {
            name
        } as EditionUpdateRequestDTO;
        const response = await CommHelper.post<EditionDTO>(ApiRoutes.editionUrl(editionId), dto);

        const newEdition = new EditionInfo(response.data);

        // Connect the new edition to other editions of its group
        newEdition.mine = true; // Cloned editions are always mine
        newEdition.otherVersions = [...prevEdition.otherVersions, prevEdition];  // Set new's other versions

        // Update otherVersions of all the previous versions
        for (const other of newEdition.otherVersions) {
            other.otherVersions.push(newEdition);
        }

        // Now update the state's edition collection
        const current = this.stateManager.editions.current;
        const allEditions = [...this.stateManager.editions.items, newEdition];
        this.stateManager.editions.items = allEditions;
        this.stateManager.editions.current = current;

        return newEdition;
    }

    public async renameEdition(editionId: number, name: string): Promise<EditionInfo> {
        const edition = this.stateManager.editions.find(editionId);
        if (!edition) {
            throw new Error(`Can't find non-existing edition ${editionId}`);
        }

        const dto = {
            name
        } as EditionUpdateRequestDTO;
        const response = await CommHelper.put<EditionDTO>(ApiRoutes.editionUrl(editionId), dto);

        edition.name = response.data.name;
        return edition;
    }
}

export default EditionService;
