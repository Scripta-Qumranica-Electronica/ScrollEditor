import { CommHelper } from './comm-helper';
import { StateManager } from '@/state';
import { TextFragmentDataListDTO, TextEditionDTO } from '@/dtos/sqe-dtos';
import { TextFragmentData, TextEdition } from '@/models/text';

class TextService {
    public stateManager: StateManager;
    constructor() {
        this.stateManager = StateManager.instance;
    }

    public async getEditionText(editionId: number) {
        const response = await CommHelper.get<TextFragmentDataListDTO>
        (`/v1/editions/${editionId}/text-fragments`);

        return response.data.textFragments.map((obj) => new TextFragmentData(obj));
    }
    public async getTextFragmentId(editionId: number, textFragmentId: number) {
        const response = await CommHelper.get<TextEditionDTO>
        (`/v1/editions/${editionId}/text-fragments/${textFragmentId}`);

        return new TextEdition(response.data);
    }
}

export default TextService;
