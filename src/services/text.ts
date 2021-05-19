import { CommHelper } from './comm-helper';
import { StateManager } from '@/state';
import {
    TextFragmentDataListDTO,
    TextEditionDTO,
    BatchEditRoiDTO,
    InterpretationRoiDTO,
    BatchEditRoiResponseDTO,
    ArtefactTextFragmentMatchListDTO
} from '@/dtos/sqe-dtos';
import {
    TextFragmentData,
    TextEdition,
    ArtefactTextFragmentData
} from '@/models/text';
import { ApiRoutes } from '@/services/api-routes';
import { Artefact } from '@/models/artefact';
import { InterpretationRoi } from '@/models/text';
import { integrifyPosition } from '@/models/misc';

class TextService {
    public stateManager: StateManager;
    constructor() {
        this.stateManager = StateManager.instance;
    }

    public async getEditionTextFragments(editionId: number) {
        const response = await CommHelper.get<TextFragmentDataListDTO>(
            ApiRoutes.allEditionTextFragmentsUrl(editionId)
        );

        return response.data.textFragments.map(
            obj => new TextFragmentData(obj)
        );
    }

    public async getArtefactTextFragments(editionId: number, artefactId: number) {
        const response = await CommHelper.get<ArtefactTextFragmentMatchListDTO>(
            ApiRoutes.artefactTextFragmentsUrl(editionId, artefactId, true)
        );

        return response.data.textFragments.map(obj => new ArtefactTextFragmentData(obj));
    }

    public async getTextFragment(editionId: number, textFragmentId: number) {
        const response = await CommHelper.get<TextEditionDTO>(
            ApiRoutes.editionTextFragmentUrl(editionId, textFragmentId)
        );

        return new TextEdition(response.data);
    }

    public async getEditionFullText(editionId: number) {
        const response = await CommHelper.get<TextEditionDTO>(ApiRoutes.editionFullTextUrl(editionId));

        return new TextEdition(response.data);
    }

    public async updateArtefactROIs(artefact: Artefact, mode: 'created' | 'deleted' | 'both' = 'both') {
        // Updates all the ROIs of the artefact.
        // This function scans the state and updates ROIs based on their status.
        // It also updates the state - deleted ROIs are removed, and the status of all other ROIs
        // is changed to 'original'
        const newROIs: InterpretationRoi[] = [];
        const deletedROIs: InterpretationRoi[] = [];

        for (const roi of artefact.rois) {
            if (roi.status === 'new' && mode !== 'deleted') {
                newROIs.push(roi);
            } else if (roi.status === 'deleted' && mode !== 'created') {
                deletedROIs.push(roi);
            }
        }

        const response = await this.updateServerROIs(artefact, newROIs, deletedROIs);
        this.updateStateCreatedROIs(artefact, newROIs, response.createRois);
        this.updateStateDeletedROIs(artefact, deletedROIs);

        return deletedROIs.length + newROIs.length;
    }

    private async updateServerROIs(artefact: Artefact, newROIs: InterpretationRoi[], deletedROIs: InterpretationRoi[]) {
        const newDTOs = newROIs.map(roi => {
            return {
                artefactId: artefact.id,
                signInterpretationId: roi.signInterpretationId,
                shape: roi.shape.wkt,
                translate: integrifyPosition(roi.position),
                stanceRotation: roi.rotation,
                exceptional: roi.exceptional,
                valuesSet: roi.valuesSet
            }  as InterpretationRoiDTO;
        });
        const deleted = deletedROIs.map(roi => roi.interpretationRoiId).filter(id => !!id) as number[];
        const body: BatchEditRoiDTO = {
            createRois: newDTOs,
            updateRois: [],
            deleteRois: deleted,
        };

        const url = ApiRoutes.batchEditRoisUrl(artefact.editionId);
        const response = await CommHelper.post<BatchEditRoiResponseDTO>(url, body);

        return response.data;
    }

    private updateStateCreatedROIs(artefact: Artefact,
                                   preSaveROIs: InterpretationRoi[],
                                   listDTO: InterpretationRoiDTO[]) {

        if (preSaveROIs.length !== listDTO.length) {
            console.error(`Server returned an ROI list with the wrong length - expected ${preSaveROIs.length} and got ${listDTO.length}`);
            return;
        }

        for (let i = 0; i < preSaveROIs.length; i++) {
            const preSave = preSaveROIs[i];
            const postSave = listDTO[i];

            // First, remove the preSave ROI
            if (preSave.signInterpretationId) {
                const si = this.stateManager.signInterpretations.get(preSave.signInterpretationId);
                if (si) {
                    si.deleteRoi(preSave);
                }
            }
            this.stateManager.interpretationRois.delete(preSave.id);

            // Add the post save ROI
            const roi = new InterpretationRoi(postSave);
            if (postSave.signInterpretationId) {
                const si = this.stateManager.signInterpretations.get(postSave.signInterpretationId);
                if (!si) {
                    console.error(
                        `Can't locate sign-interpratation ${postSave.signInterpretationId} ` +
                        `in artefact ${artefact.id}`);
                } else {
                    si.rois.push(roi);
                }
            }

            this.stateManager.interpretationRois.put(roi);

            // Map the old ID to the new ID
            if (preSave.id !== roi.id) {
                this.stateManager.interpretationRois.mapFrontendIdToServerId(preSave.id, roi.id);
            }
        }
    }

    private updateStateDeletedROIs(artefact: Artefact, rois: InterpretationRoi[]) {
        for (const roi of rois) {
            this.stateManager.interpretationRois.delete(roi.id);
        }
    }
}

export default TextService;
