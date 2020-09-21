import { CommHelper } from './comm-helper';
import { StateManager } from '@/state';
import { ApiRoutes } from '@/services/api-routes';
import { EditionInfo } from '@/models/edition';
import { SignInterpretation } from '@/models/text';
import { AttributeDTO, InterpretationAttributeCreateDTO, InterpretationAttributeDTO, SignInterpretationDTO } from '@/dtos/sqe-dtos';

export default class SignInterpretationService {
    public stateManager: StateManager;

    /*
     * Note - the service does not update the state manager, it is assumed that the state is already updated before
     * the service methods are called.
     */

    constructor() {
        this.stateManager = StateManager.instance;
    }

    public async updateAttribute(edition: EditionInfo, signInterpretation: SignInterpretation, attribute: InterpretationAttributeDTO) {
        const url = ApiRoutes.attributeUrl(edition.id, signInterpretation.id, attribute.attributeValueId);
        const dto: InterpretationAttributeCreateDTO = {
            attributeId: attribute.attributeId,
            attributeValueId: attribute.attributeValueId,
            commentary: attribute.commentary?.commentary
        };

        const siDto = await CommHelper.put<SignInterpretationDTO>(url, dto);
        return siDto;
    }

    public async deleteAttribute(edition: EditionInfo, signInterpretation: SignInterpretation, attributeValueId: number) {
        const url = ApiRoutes.attributeUrl(edition.id, signInterpretation.id, attributeValueId);

        await CommHelper.delete(url);
    }

    public async createAttribute(edition: EditionInfo, signInterpretation: SignInterpretation, attribute: InterpretationAttributeDTO) {
        const url = ApiRoutes.attributeUrl(edition.id, signInterpretation.id);
        const dto: InterpretationAttributeCreateDTO = {
            attributeId: attribute.attributeId,
            attributeValueId: attribute.attributeValueId,
            commentary: attribute.commentary?.commentary
        };

        const siDto = await CommHelper.post<SignInterpretationDTO>(url, dto);
        return siDto;
    }
}
