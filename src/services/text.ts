import { CommHelper } from './comm-helper';
import { StateManager } from '@/state';
import { TextFragmentDataListDTO, TextEditionDTO } from '@/dtos/sqe-dtos';
import { TextFragmentData, TextEdition } from '@/models/text';
import { ApiRoutes } from '@/variables';

class TextService {
    public stateManager: StateManager;
    constructor() {
        this.stateManager = StateManager.instance;
    }

    public async getEditionText(editionId: number) {
        const response = await CommHelper.get<TextFragmentDataListDTO>
        (ApiRoutes.allEditionTextFragmentsUrl(editionId));

        return response.data.textFragments.map((obj) => new TextFragmentData(obj));
    }
    public async getTextFragmentId(editionId: number, textFragmentId: number) {
        const response = await CommHelper.get<TextEditionDTO>
        (ApiRoutes.editionTextFragmentUrl(editionId, textFragmentId));

        return new TextEdition(response.data);
    }
}

export default TextService;
