
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
import { ImagedObject } from '@/models/imaged-object';
import { Artefact } from '@/models/artefact';

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
        if (artefact) {
            const newArtefact = new Artefact(artefact);
            StateManager.instance.imagedObjects.current!.artefacts.push(newArtefact);
        }
    }

    public handleDeletedArtefact(artefactId: number): void {
        if (artefactId) {
            const deletedArtefactIndex = StateManager.instance.imagedObjects.current!.artefacts.findIndex(a => a.id === artefactId)
            if (deletedArtefactIndex > -1) {
                StateManager.instance.imagedObjects.current!.artefacts.splice(deletedArtefactIndex, 1)
            } 
        }
    }

    public handleUpdatedArtefact(artefact: ArtefactDTO): void {
           const changed = new Artefact(artefact);
           StateManager.instance.artefacts.update(changed);
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
