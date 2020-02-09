
import {
    EditionDTO,
    InterpretationRoiDTO,
    ArtefactDTO,
    InterpretationRoiDTOList,
    BatchEditRoiResponseDTO,
    UpdatedInterpretationRoiDTO,
    UpdatedInterpretationRoiDTOList,
} from '@/dtos/sqe-dtos';
import { EditionInfo } from '@/models/edition';
import { StateManager } from '.';

/* This file contains the implementation of all the incoming events from SignalR */

export class NotificationHandler {
    public handleUpdatedEdition(edition: EditionDTO): void {
        const storedEdition = StateManager.instance.editions.find(edition.id);

        if (storedEdition) {
            const editionInfo = new EditionInfo(edition);
            const newEdition = { ...storedEdition, ...editionInfo };
            StateManager.instance.editions.update(newEdition);
        }
    }

    public handleCreatedArtefact(artefact: ArtefactDTO): void {
        console.warn('No implementation for handleCreatedArtefact', artefact);
    }

    public handleDeletedArtefact(artefactId: number): void {
        console.warn('No implementation for handleDeletedArtefact ', artefactId);
    }

    public handleUpdatedArtefact(artefact: ArtefactDTO): void {
        console.warn('No implementation for handleUpdatedArtefact', artefact);
    }

    public handleCreatedRoi(roi: InterpretationRoiDTO): void {
        console.warn('No implementation for handleCreatedRoi', roi);
    }

    public handleCreatedRoisBatch(roiList: InterpretationRoiDTOList): void {
        console.warn('No implementation for handleCreatedRoisBatch', roiList);
    }

    public handleEditedRoisBatch(rois: BatchEditRoiResponseDTO): void {
        console.warn('No implementation for handleEditodRoisBatch', rois);
    }

    public handleUpdatedRoi(roi: UpdatedInterpretationRoiDTO): void {
        console.warn('No implementation for handleUpdatedRoi', roi);
    }

    public handleUpdatedRoisBatch(rois: UpdatedInterpretationRoiDTOList): void {
        console.warn('No implementation for handleUpdatedRoisBatch', rois);
    }

    public handleDeletedRoi(roiId: number): void {
        console.warn('No implementation for handleDeleteRoi', roiId);
    }
}
