
import {
    EditionDTO,
    InterpretationRoiDTO,
    ArtefactDTO,
    InterpretationRoiDTOList,
    BatchEditRoiResponseDTO,
    UpdatedInterpretationRoiDTO,
    UpdatedInterpretationRoiDTOList,
    DeleteDTO,
    DetailedEditorRightsDTO, SignInterpretationDTO, SignInterpretationListDTO, SignDTO, DeleteIntIdDTO
} from '@/dtos/sqe-dtos';
import { EditionInfo, ShareInfo, Permissions } from '@/models/edition';
import { StateManager } from '.';
import { Artefact } from '@/models/artefact';
import { removeFromArray, addToArray } from '@/utils/collection-utils';
import { InterpretationRoi, Sign, SignInterpretation } from '@/models/text';
import Vue from 'vue';

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
            storedEdition.copyFrom(editionInfo);
            state().editions.update(storedEdition);
        }
    }

    public handleCreatedArtefact(artefact: ArtefactDTO): void {
        const newArtefact = new Artefact(artefact);

        state().artefacts.add(newArtefact, false); // Safely ignore error if artefact is already there
        if (state().imagedObjects.current?.id === artefact.imagedObjectId) {
            addToArray(newArtefact, StateManager.instance.imagedObjects.current?.artefacts);
        }
    }

    public handleDeletedArtefact(dto: DeleteIntIdDTO): void {
        for (const artefactId of dto.ids) {
            state().artefacts.remove(artefactId, false);

            // There is no imaged object ID received from the server, so we just remove the artefact from the
            // current imaged object as well. If the artefact belongs to another imaged object, nothing is removed.
            removeFromArray(artefactId, state().imagedObjects.current?.artefacts);
        }
    }

    public handleUpdatedArtefact(dto: ArtefactDTO): void {
        const existingArtefact = state().artefacts.find(dto.id);
        if (!existingArtefact) {
            // We don't have this aretfact, no need to update it
            return;
        }
        if (!dto.mask) {
            dto.mask = existingArtefact.mask.wkt;
        }
        const newArtefact = new Artefact(dto);
        existingArtefact.copyFrom(newArtefact);
    }

    public handleCreatedRoi(roi: InterpretationRoiDTO): void {
        console.debug('handleCreatedRoi', roi);
        handleCreatedRoi(roi);
        notifyRoiChanged();
    }

    public handleCreatedRoisBatch(roiList: InterpretationRoiDTOList): void {
        console.debug('handleCreatedRoisBatch', roiList);
        roiList.rois.map(roi => handleCreatedRoi(roi));
        notifyRoiChanged();
    }

    public handleEditedRoisBatch(rois: BatchEditRoiResponseDTO): void {
        console.debug('handleEditedRoisBatch', rois);

        rois.createRois.map(roi => handleCreatedRoi(roi));
        rois.deleteRois.map(roiId => handleDeletedRoi(roiId));
        rois.updateRois.map(roi => handleUpdatedRoi(roi));
        notifyRoiChanged();
    }

    public handleUpdatedRoi(roi: UpdatedInterpretationRoiDTO): void {
        console.debug('handleUpdatedRoi', roi);

        handleUpdatedRoi(roi);
        notifyRoiChanged();
    }

    public handleUpdatedRoisBatch(roiList: UpdatedInterpretationRoiDTOList): void {
        console.debug('handleUpdatedRoisBatch', roiList);

        roiList.rois.map(roi => handleUpdatedRoi(roi));
        notifyRoiChanged();
    }

    public handleDeletedRoi(dto: DeleteIntIdDTO): void {
        console.debug('handleDeletedRoi', dto);

        for (const roiId of dto.ids) {
            handleDeletedRoi(roiId);
            notifyRoiChanged();
        }
    }

    public handleCreatedEditor(dto: DetailedEditorRightsDTO): void {
        const edition = state().editions.find(dto.editionId);
        if (edition) {
            const shareIndex = edition.shares.findIndex(s => s.email === dto.email);
            const newShare = ShareInfo.fromDTO(dto);

            if (shareIndex > -1) {
                Vue.set(edition.shares, shareIndex, newShare);
            } else {
                edition.shares.push(newShare);
            }

            // We also need to update our own permissions if the changed editor is the current logged in user
            if (dto.email === state().session?.user?.email) {
                edition.permission = new Permissions(dto);
            }
        }
    }

    public handleUpdatedSignInterpretations(dto: SignInterpretationListDTO): void {
        console.debug('handleUpdatedSignInterpretations', dto);
        for (const siDto of dto.signInterpretations || []) {
            handleUpdatedSignInterpretation(siDto);
        }
    }

    public handleUpdatedSignInterpretation(dto: SignInterpretationDTO): void {
        console.debug('handleUpdatedSignInterpretation', dto);
        handleUpdatedSignInterpretation(dto);
    }

    public handleDeletedSignInterpretation(dto: DeleteIntIdDTO): void {
        console.debug('handleDeletedSignInterpretation', dto);
        if (dto.entity !== 'signInterpretation') {
            console.warn('Deleted Sign Interpretation notifcation arrived with the entity ', dto.entity);
            return;
        }

        for (const id of dto.ids) {
            const si = state().signInterpretations.get(id);
            if (!si) {
                // Sign Interpretation has already been deleted
                return;
            }

            // First, remove the sign interpretation from the sign
            const sign = si.sign;
            if (sign.signInterpretations.length !== 1) {
                // console.warn('Only signs with one sign interperation are supported');
                return;
            }

            const line = sign.line;
            if (line.signs[sign.indexInLine] === sign) {
                line.removeSign(sign);
            } else {
                // Do nothing, sign has already been deleted here
            }

            state().signInterpretations.delete(id);
            // We do not remove the sign interpretation from the map, as we may need it for undoing (if this browser originated the call),
            // and it's not going to hurt since it will no longer be displayed anyway.
        }
    }

    public handleCreatedSignInterpretation(dto: SignInterpretationListDTO): void {
        console.debug('handleCreatedSignInterpretation', dto);

        if (!dto.signInterpretations) {
            return;
        }

        for (const siDto of dto.signInterpretations?.reverse()) {
            // Multiple added sign interpretations are specified from first to last, but we need to add them from last to first,
            // since each sign points to the next one. If we add sign A before sign B, we can't connect A to B sign B does not exist yet.
            const existingSi = state().signInterpretations.get(siDto.signInterpretationId);
            if (existingSi) {
                return;
            }

            if (!siDto.nextSignInterpretations) {
                console.warn("Can't add sign-interpretation without next-interpretation IDs");
                return;
            }

            // Find a sign intepretation that goes after this sign
            let siNext: SignInterpretation | undefined;
            for (const nextId of siDto.nextSignInterpretations) {
                siNext = state().signInterpretations.get(nextId.nextSignInterpretationId);
                if (siNext) {
                    break;
                }
            }

            if (!siNext) {
                console.warn("Can't find any sign-interpretation next to the newly created sign");
                return;
            }

            // Now we can add the sign before the next sign, on the same line
            const indexInLine = siNext.sign.indexInLine;
            const sign = new Sign({ signInterpretations: []}, siNext.sign.line, indexInLine);
            const si = new SignInterpretation(siDto, sign);
            sign.signInterpretations.push(si);
            state().signInterpretations.put(si);
            sign.line.addSign(sign);
        }
    }
}

/*
 * Some updating functions are handled in external functions which are called from the NotificationHandler.
 *
 * We have to use these function, since `this` is not initialized properly in the notification handler's
 * methods, so we can't call one handler from another.
 *
 * After updating ROIs, components displaying ROIs should be notified (since not all properties are computed
 * from the state). We use the event bus to fire an roi-changed event, causing components to refresh.
 */

function handleCreatedRoi(dto: InterpretationRoiDTO) {
    console.debug('handleCreatedRoi', dto);
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
    console.debug('handleDeletedRoi', roiId);
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

function handleUpdatedSignInterpretation(dto: SignInterpretationDTO): void {
    const existingSI = state().signInterpretations.get(dto.signInterpretationId);

    if (!existingSI) {
        console.warn('Receive an updated for a non-existent sign interpretation ', dto.signInterpretationId);
        return;
    }

    // Update the sign interpretations map
    const newSI = new SignInterpretation(dto, existingSI.sign);
    state().signInterpretations.put(newSI);

    // Update the sign containing the sign interpretation
    const sign = newSI.sign;
    const index = sign.signInterpretations.findIndex(si => si.id === newSI.id);

    if (index < 0) {
        console.warn("Can't locate sign interpretation in sign!");
    } else {
        Vue.set(sign.signInterpretations, index, newSI);
    }

    // Update the selected sign interpretations
    const selectedIndex = state().textFragmentEditor.selectedSignInterpretations.findIndex(si => si.id === newSI.id);
    if (selectedIndex !== -1) {
        Vue.set(state().textFragmentEditor.selectedSignInterpretations, selectedIndex, newSI);

        // Update the selected attribute, too
        const selectedAttribute = state().textFragmentEditor.selectedAttribute;
        if (selectedAttribute) {
            // Find the attribute in the new sign interpretation
            const attrInNewSI = newSI.attributes.filter(attr => attr.attributeValueId === selectedAttribute.attributeValueId);
            if (attrInNewSI.length === 1) {
                state().textFragmentEditor.selectedAttribute = attrInNewSI[0];
            } else {
                state().textFragmentEditor.selectedAttribute = null;
            }
        }
    }
}

function notifyRoiChanged() {
    state().eventBus.emit('roi-changed');
}
