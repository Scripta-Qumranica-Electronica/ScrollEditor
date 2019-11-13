import { CommHelper } from './comm-helper';
import { StateManager } from '@/state';
import {
    TextFragmentDataListDTO,
    TextEditionDTO,
    SetInterpretationRoiDTO,
    InterpretationRoiDTOList,
    SetInterpretationRoiDTOList
} from '@/dtos/sqe-dtos';
import {
    TextFragmentData,
    TextEdition,
    SignInterpretation
} from '@/models/text';
import { ApiRoutes } from '@/services/api-routes';
import { Artefact } from '@/models/artefact';
import { InterpretationRoi } from '@/models/text';

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

    public async getTextFragment(editionId: number, textFragmentId: number) {
        const response = await CommHelper.get<TextEditionDTO>(
            ApiRoutes.editionTextFragmentUrl(editionId, textFragmentId)
        );

        return new TextEdition(response.data);
    }

    public async updateArtefactROIs(artefact: Artefact) {
        // Updates all the ROIs of the artefact.
        // This function scans the state and updates ROIs based on their status.
        // It also updates the state - deleted ROIs are removed, and the status of all other ROIs
        // is changed to 'original'
        const newROIs: InterpretationRoi[] = [];
        const deletedROIs: InterpretationRoi[] = [];

        for (const roi of this.stateManager.interpretationRois.getArtefactRois(
            artefact
        )) {
            if (roi.status === 'new') {
                newROIs.push(roi);
            } else if (roi.status === 'deleted') {
                deletedROIs.push(roi);
            }
        }

        const createdResponse = await this.createNewROIs(artefact, newROIs);
        this.updateCreatedROIs(artefact, newROIs, createdResponse);
        await this.deleteROIs(artefact, deletedROIs);
        this.updateDeletedROIs(artefact, deletedROIs);

        return deletedROIs.length + newROIs.length;
    }

    private async createNewROIs(artefact: Artefact, newROIs: InterpretationRoi[]) {
        const dtos: SetInterpretationRoiDTO[] = newROIs.map(roi => {
            return {
                artefactId: artefact.id,
                signInterpretationId: roi.signInterpretationId,
                shape: roi.shape.wkt,
                translate: roi.position,
                stanceRotation: roi.rotation,
                exceptional: roi.exceptional,
                valuesSet: roi.valuesSet
            };
        });
        const body = {
            rois: dtos
        } as SetInterpretationRoiDTOList;
        const url = ApiRoutes.batchCreateRoisUrl(artefact.editionId);
        const response = await CommHelper.post<InterpretationRoiDTOList>(
            url,
            body
        );

        return response.data;
    }

    private updateCreatedROIs(artefact: Artefact, preSaveROIs: InterpretationRoi[], listDTO: InterpretationRoiDTOList) {
        const postSaveROIs = listDTO.rois.map(dto => new InterpretationRoi(dto));

        // First, remove the preSave ROIs
        for (const preSave of preSaveROIs) {
            if (preSave.signInterpretationId) {
                const si = this.stateManager.signInterpretations.get(preSave.signInterpretationId);
                if (si) {
                    si.deleteRoi(preSave);
                }
            }
            this.stateManager.interpretationRois.delete(preSave.id);
        }

        // Now add the new ones
        for (const postSave of listDTO.rois) {
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
        }
    }

    private async deleteROIs(artefact: Artefact, rois: InterpretationRoi[]) {
        // For now we need to delete the ROIs one by one.
        for (const roi of rois) {
            if (!roi.interpretationRoiId) {
                continue;  // This ROI has never been saved to the server
            }
            const url = ApiRoutes.roiUrl(artefact.editionId, roi.interpretationRoiId);
            await CommHelper.delete(url);
        }
    }

    private updateDeletedROIs(artefact: Artefact, rois: InterpretationRoi[]) {
        for (const roi of rois) {
            this.stateManager.interpretationRois.delete(roi.id);
        }
    }
}

export default TextService;
