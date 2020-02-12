
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
import { InterpretationRoi } from '@/models/text';

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
        handleCreatedRoi(roi);
        notifyRoiChanged();
    }

    public handleCreatedRoisBatch(roiList: InterpretationRoiDTOList): void {
        roiList.rois.map(roi => handleCreatedRoi(roi));
        notifyRoiChanged();
    }

    public handleEditedRoisBatch(rois: BatchEditRoiResponseDTO): void {
        rois.createRois.map(roi => handleCreatedRoi(roi));
        rois.deleteRois.map(roiId => handleDeletedRoi(roiId));
        rois.updateRois.map(roi => handleUpdatedRoi(roi));
        notifyRoiChanged();
    }

    public handleUpdatedRoi(roi: UpdatedInterpretationRoiDTO): void {
        handleUpdatedRoi(roi);
        notifyRoiChanged();
    }

    public handleUpdatedRoisBatch(roiList: UpdatedInterpretationRoiDTOList): void {
        roiList.rois.map(roi => handleUpdatedRoi(roi));
        notifyRoiChanged();
    }

    public handleDeletedRoi(roiId: number): void {
        handleDeletedRoi(roiId);
        notifyRoiChanged();
    }
}

/*
 * ROI updating is handled in external functions which are called from the NotificationHandler.
 *
 * We have to use these function, since `this` is not initialized properly in the notification handler's
 * methods, so we can't call one handler from another.
 *
 * After updating ROIs, components displaying ROIs should be notified (since not all properties are computed
 * from the state). We use the event bus to fire an roi-changed event, causing components to refresh.
 */

function handleCreatedRoi(dto: InterpretationRoiDTO) {
    // Add roi to all the ROIs, as well as to the specific sign interpretation
    const roi = new InterpretationRoi(dto);
    state().interpretationRois.put(roi);

    if (roi.signInterpretationId) {
        const si = state().signInterpretations.get(roi.signInterpretationId);
        if (si) {
            addToArray(roi, si.rois);
        }
    }
}

function handleDeletedRoi(roiId: number) {
    const roi = state().interpretationRois.get(roiId);
    if (!roi) {
        return;
    }
    state().interpretationRois.delete(roiId);

    if (roi.signInterpretationId) {
        const si = state().signInterpretations.get(roi.signInterpretationId);
        if (si) {
            si.deleteRoi(roi);
        }
    }
}

function handleUpdatedRoi(dto: UpdatedInterpretationRoiDTO) {
    // Just delete the old one and add the new one. Order of ROIs inside
    // the lists is of no consqeuence.
    handleDeletedRoi(dto.oldInterpretationRoiId);
    handleCreatedRoi(dto);
}

function notifyRoiChanged() {
    state().eventBus.$emit('roi-changed');
}
