
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
import { Artefact } from '@/models/artefact';
import { updateInArray, removeFromArray, addToArray } from '@/utils/collection-utils';

/* This file contains the implementation of all the incoming events from SignalR */

function state() {
    return StateManager.instance;
}

/*
 * The notification handler for all notifications.
 *
 * CAREFUL! For some reason that has not been resolved yet, 'this' is not bound to the right object,
 * so do not use this in any of the handlers!
 */
export class NotificationHandler {
    public handleUpdatedEdition(edition: EditionDTO): void {
        const storedEdition = StateManager.instance.editions.find(edition.id);

        if (storedEdition) {
            const editionInfo = new EditionInfo(edition);
            const newEdition = { ...storedEdition, ...editionInfo };
            state().editions.update(newEdition);
        }
    }

    public handleCreatedArtefact(artefact: ArtefactDTO): void {
        const newArtefact = new Artefact(artefact);

        state().artefacts.add(newArtefact, false); // Safely ignore error if artefact is already there
        if (state().imagedObjects.current?.id === artefact.imagedObjectId) {
            addToArray(newArtefact, StateManager.instance.imagedObjects.current?.artefacts);
        }
    }

    public handleDeletedArtefact(artefactId: number): void {
        state().artefacts.remove(artefactId, false);

        // There is no imaged object ID received from the server, so we just remove the artefact from the
        // current imaged object as well. If the artefact belongs to another imaged object, nothing is removed.
        removeFromArray(artefactId, state().imagedObjects.current?.artefacts);
    }

    public handleUpdatedArtefact(artefact: ArtefactDTO): void {
        console.debug('handleUpdatedArtefact ', artefact);
        const changed = new Artefact(artefact);
        state().artefacts.update(changed, false);

        if (state().imagedObjects.current?.id === artefact.imagedObjectId) {
            // Updates of array elements do not cause a refresh, we need
            updateInArray(changed, state().imagedObjects.current?.artefacts);
            console.debug('Updated artefacts of current imagedObject: ', state().imagedObjects.current?.artefacts);
        }
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

    private get state() {
        return StateManager.instance;
    }
}
