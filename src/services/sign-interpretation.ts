import { CommHelper } from './comm-helper';
import { StateManager } from '@/state';
import { ApiRoutes } from '@/services/api-routes';
import { EditionInfo } from '@/models/edition';
import { SignInterpretation } from '@/models/text';
import { CommentaryCreateDTO, InterpretationAttributeCreateDTO, InterpretationAttributeDTO, SignInterpretationCharacterUpdateDTO, SignInterpretationCreatedDTO, SignInterpretationCreateDTO, SignInterpretationDTO, SignInterpretationListDTO, SignInterpretationVariantDTO } from '@/dtos/sqe-dtos';

export default class SignInterpretationService {
    public stateManager: StateManager;

    /*
     * Note - the service does not update the state manager, it is assumed that the state is already updated before
     * the service methods are called.
     */

    constructor() {
        this.stateManager = StateManager.instance;
    }

    public async updateAttribute(edition: EditionInfo, signInterpretation: SignInterpretation, oldValueId: number, attribute: InterpretationAttributeDTO) {
        const url = ApiRoutes.attributeUrl(edition.id, signInterpretation.id, oldValueId);
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

        const response = await CommHelper.post<SignInterpretationDTO>(url, dto);
        return response.data;
    }

    public async updateCommentary(edition: EditionInfo, signInterpretation: SignInterpretation) {
        const url = ApiRoutes.signInterpretationCommentaryUrl(edition.id, signInterpretation.id);
        const dto: CommentaryCreateDTO = { commentary: signInterpretation.commentary || undefined };

        const response = await CommHelper.put<SignInterpretationDTO>(url, dto);
        return response.data;
    }

    public async deleteSignInterpretation(edition: EditionInfo, signInterpretation: SignInterpretation, deleteAllVariants = true) {
        let url = ApiRoutes.signInterpretationUrl(edition.id, signInterpretation.id);
        if (deleteAllVariants) {
            url += '?optional=delete-all-variants';
        }

        await CommHelper.delete(url);

        signInterpretation.signInterpretationId = SignInterpretation.nextAvailableId;  // Give the sign interpretation a negative ID, so it can still remain in the undo/redo system
    }

    public async createSignInterpretation(edition: EditionInfo, signInterpretation: SignInterpretation) {
        console.debug(`About to create sign interpretation in server, local id is ${signInterpretation.signInterpretationId}`);
        const url = ApiRoutes.signInterpretationUrl(edition.id);

        // Find the previous signInterpretationId
        const prevSign = signInterpretation.sign.line.signs[signInterpretation.sign.indexInLine - 1];
        const prevSignInterpretation = prevSign.signInterpretations[0];

        // Now we can build the DTO
        const attributeDTOs = signInterpretation.attributes.map(attr => {
             return {
                 attributeId: attr.attributeId,
                 attributeValueId: attr.attributeValueId,
                 commentary: attr.commentary,
            } as InterpretationAttributeCreateDTO;
        });

        const commentaryDTO = signInterpretation.commentary ? { commentary: signInterpretation.commentary } : undefined;
        const dto: SignInterpretationCreateDTO = {
            character: signInterpretation.character,
            previousSignInterpretationIds: [prevSignInterpretation.id],
            attributes: attributeDTOs,
            rois: [],
            commentary: commentaryDTO,
            isVariant: false,
            breakPreviousAndNextSignInterpretations: true,
        };

        const response = await CommHelper.post<SignInterpretationCreatedDTO>(url, dto);

        if (response.data.created?.length !== 1) {
            console.warn('Received a bad response from the server - expected exactly one sign to be created');
            return;
            // TODO: Raise the inconsistent event to reload the page
        }

        const siDto = response.data.created![0];
        const newId = siDto.signInterpretationId;
        console.debug(`New sign interpretation id is ${newId}`);

        const existingSi = this.stateManager.signInterpretations.get(newId);
        if (existingSi) {
            // This sign interpretation has already been added by the SignalR notification, but we already have
            // the sign we've created, with the old frontend-only ID. So we have twp sign interpretations.
            //
            // Easiest way to handle this is to delete the sign interpretation added by the Signal R notification handler,
            // and update the ID of the sign interpretation we do have
            existingSi.sign.line.removeSign(existingSi.sign);
            this.stateManager.signInterpretations.delete(existingSi.signInterpretationId);
        }

        // Update the sign intepretation from the old ID to the new one, and update the sign interpretation map as well
        this.stateManager.signInterpretations.mapFrontendIdToServerId(signInterpretation.id, newId);
        signInterpretation.signInterpretationId = newId;
    }

    public async updateSignInterpretation(edition: EditionInfo, signInterpretation: SignInterpretation) {
        const url = ApiRoutes.signInterpretationCharacterUrl(edition.id, signInterpretation.id);
        const dto: SignInterpretationCharacterUpdateDTO = {
            character: signInterpretation.character || ' ',
            attributeValueId: signInterpretation.signType[0], // The DTO should be updated shortly to support this
            priority: 1,
        };

        await CommHelper.put<SignInterpretationCreatedDTO>(url, dto);
    }
}
