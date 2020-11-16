import { CommHelper } from './comm-helper';
import { StateManager } from '@/state';
import { ApiRoutes } from '@/services/api-routes';
import { EditionInfo } from '@/models/edition';
import { SignInterpretation } from '@/models/text';
import { CommentaryCreateDTO, InterpretationAttributeCreateDTO, InterpretationAttributeDTO, SignInterpretationCreateDTO, SignInterpretationDTO, SignInterpretationListDTO } from '@/dtos/sqe-dtos';

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

        const response = await CommHelper.post<SignInterpretationListDTO>(url, dto);

        // Find the ID of the new SI. The response contains all the updated SIs - usually twp -
        // the new SI And the SI right before it.
        let newId: number | undefined;
        for (const siDto of response.data.signInterpretations || []) {
            if (!this.stateManager.signInterpretations.get(siDto.signInterpretationId)) {
                if (newId) {
                    console.error('More than one unknown ID returned from server');
                    // TODO: Raise the 'corrupted' event so that the page is reloaded
                    return;
                }
                newId = siDto.signInterpretationId;
            }
        }
        if (!newId) {
            console.error('The ID of the new sign interpretation was not returned from the server');
            return;
        }

        // Update the sign intepretation from the old ID to the new one, and update the sign interpretation map as well
        this.stateManager.signInterpretations.mapFrontendIdToServerId(signInterpretation.id, newId);
        signInterpretation.signInterpretationId = newId;
    }
}
