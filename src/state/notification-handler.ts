
import {
    EditionDTO,
    InterpretationRoiDTO,
    ArtefactDTO,
    InterpretationRoiDTOList,
    BatchEditRoiResponseDTO,
    UpdatedInterpretationRoiDTO,
    UpdatedInterpretationRoiDTOList,
    DeleteDTO,
    DetailedEditorRightsDTO, SignInterpretationDTO, SignInterpretationListDTO, SignDTO, DeleteIntIdDTO,
    ArtefactGroupDTO
} from '@/dtos/sqe-dtos';
import { EditionInfo, ShareInfo, Permissions, ArtefactGroup } from '@/models/edition';
import { StateManager } from '.';
import { Artefact } from '@/models/artefact';
import { Placement } from '@/utils/Placement';
import { removeFromArray, addToArray } from '@/utils/collection-utils';
import { InterpretationRoi, Sign, SignInterpretation } from '@/models/text';

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
        // If we already hold this artefact (e.g. our own echo), apply it through
        // the single reactive write path instead of ignoring it.
        const existing = state().artefacts.find(artefact.id);
        if (existing) {
            applyArtefactUpdate(existing, artefact);
            return;
        }

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
            // We don't have this artefact, no need to update it
            return;
        }
        applyArtefactUpdate(existingArtefact, dto);
    }

    public handleCreatedArtefactGroup(dto: ArtefactGroupDTO): void {
        upsertArtefactGroup(dto);
    }

    public handleUpdatedArtefactGroup(dto: ArtefactGroupDTO): void {
        upsertArtefactGroup(dto);
    }

    public handleDeletedArtefactGroup(dto: DeleteIntIdDTO): void {
        const edition = state().editions.current;
        if (!edition) {
            return;
        }
        for (const id of dto.ids) {
            const idx = edition.artefactGroups.findIndex(g => g.groupId === id);
            if (idx > -1) {
                // splice is a reactive array mutation in Vue 2.
                edition.artefactGroups.splice(idx, 1);
            }
        }
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
        console.debug('handleUpdatedRoiBatch', roiList);
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
                edition.shares[shareIndex] = newShare;
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
        console.debug('handleCreatedSignInterpretaions', dto);

        for (const siDto of dto.signInterpretations || []) {
            handleUpdatedSignInterpretation(siDto);
        }
    }

    public handleUpdatedSignInterpretation(dto: SignInterpretationDTO): void {
        console.debug('handleCreatedSignInterpretaion', dto);

        handleUpdatedSignInterpretation(dto);
    }

    public handleDeletedSignInterpretation(dto: DeleteIntIdDTO): void {
        console.debug('handleDeletedSignInterpretaion', dto);

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
        console.debug('handleCreatedSignInterpretaion', dto);

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

// Single reactive write path for an artefact coming from a notification. Copies
// the DTO into the EXISTING instance (preserving object identity for components
// bound to it) and then replaces it in the collection so the new array reference
// re-triggers reactivity for every consumer (e.g. the manuscript view's
// `placedArtefacts` computed). Without the collection replace, copyFrom mutates
// the instance in place but the collection array is unchanged, dependent computeds
// never re-run, and the manuscript view stays stale until reload. Mirrors the HTTP
// path (services/artefact.ts) and the handleUpdatedEdition reference handler.
// This is the ONE place artefact geometry/placement is written from notifications.
// Op-ids of local mutations sent to the server and awaiting their broadcast echo.
// When an UpdatedArtefact carries one of these it is our own confirmed change
// (opId reconciliation): apply it authoritatively and bypass the pending-op guard
// rather than treat it as a foreign edit.
const pendingOpIds = new Set<string>();

export function registerPendingOperation(opId: string): void {
    pendingOpIds.add(opId);
}

// Public single reducer for an artefact DTO — used by BOTH the SignalR handler
// and the HTTP-response path (services/artefact.ts) so the two share one code
// path. Pass isOwnChange=true for a locally-originated write (its HTTP response).
export function applyArtefactDto(dto: ArtefactDTO, isOwnChange = false): void {
    const existing = state().artefacts.find(dto.id);
    if (existing) {
        applyArtefactUpdate(existing, dto, isOwnChange);
    } else {
        state().artefacts.add(new Artefact(dto), false);
    }
}

function applyArtefactUpdate(existing: Artefact, dto: ArtefactDTO, isOwnChange = false): Artefact {
    // A broadcast carrying one of our pending op-ids is our own confirmed change.
    const own = isOwnChange || (!!dto.operationId && pendingOpIds.delete(dto.operationId));
    // Pending-op guard (P3 reconciliation): if the local user has an unsaved
    // operation on this artefact (e.g. mid drag/edit before the 3s auto-save),
    // do not let an inbound PEER update overwrite their in-progress local state.
    // Our own confirmed change (own=true) bypasses this and applies authoritatively.
    const om = state().operationsManager;
    if (!own && om && om.isEntityDirty(existing.id)) {
        return existing;
    }
    if (!dto.mask) {
        // The server omits the mask when it did not change; keep the one we have.
        dto.mask = existing.mask.wkt;
    }
    const updated = new Artefact(dto);
    // Diff-before-write (P3 reconciliation): if the incoming artefact is
    // render-identical to what we already hold — e.g. our own change echoed back
    // because the caller stays in the edition group, or a placement-only update
    // whose mask we backfilled — skip the reactive write entirely. No new array
    // reference, no re-render, no SVG re-emit, no flicker. Only a genuine change
    // touches Vue reactivity.
    if (artefactRenderEqual(existing, updated)) {
        return existing;
    }
    existing.copyFrom(updated);
    state().artefacts.update(existing, false);
    return existing;
}

// Structural equality on the fields that affect rendering/layout. Used to avoid
// redundant reactive writes (see applyArtefactUpdate).
function artefactRenderEqual(a: Artefact, b: Artefact): boolean {
    return a.mask.wkt === b.mask.wkt
        && a.name === b.name
        && a.isPlaced === b.isPlaced
        && a.side === b.side
        && placementEqual(a.placement, b.placement);
}

function placementEqual(a: Placement, b: Placement): boolean {
    return a.scale === b.scale
        && a.rotate === b.rotate
        && a.zIndex === b.zIndex
        && a.mirrored === b.mirrored
        && a.translate.x === b.translate.x
        && a.translate.y === b.translate.y;
}

// Reactive upsert of an artefact group into the current edition. `artefactGroups`
// is a plain array on the reactive EditionInfo instance, so mutating an existing
// group's fields in place (preserving identity for any held reference, e.g. a
// selected group) or pushing/Vue.set-ing a new one triggers reactivity for the
// scroll editor. We deliberately do NOT emit 'select-group' here — a remote
// change must not hijack the local user's current selection.
function upsertArtefactGroup(dto: ArtefactGroupDTO): void {
    const edition = state().editions.current;
    if (!edition) {
        return;
    }
    const existing = edition.artefactGroups.find(g => g.groupId === dto.id);
    if (existing) {
        // Diff-before-write (P3): skip if unchanged (e.g. our own echo).
        if (existing.name === dto.name && numberArraysEqual(existing.artefactIds, dto.artefacts)) {
            return;
        }
        existing.name = dto.name;
        existing.artefactIds = [...dto.artefacts]; // reassign -> reactive
    } else {
        edition.artefactGroups.push(new ArtefactGroup(dto));
    }
}

function numberArraysEqual(a: number[], b: number[]): boolean {
    if (a.length !== b.length) {
        return false;
    }
    for (let i = 0; i < a.length; i = i + 1) {
        if (a[i] !== b[i]) {
            return false;
        }
    }
    return true;
}

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
    console.debug('handleUpdatedRoi', dto);

    // Just delete the old one and add the new one. Order of ROIs inside
    // the lists is of no consqeuence.
    handleDeletedRoi(dto.oldInterpretationRoiId);
    handleCreatedRoi(dto);
}

function handleUpdatedSignInterpretation(dto: SignInterpretationDTO): void {
    console.debug('handleUpdatedSignInterpretaion', dto);
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
        sign.signInterpretations[index] = newSI;
    }

    // Update the selected sign interpretations
    const selectedIndex = state().textFragmentEditor.selectedSignInterpretations.findIndex(si => si.id === newSI.id);
    if (selectedIndex !== -1) {
        state().textFragmentEditor.selectedSignInterpretations[selectedIndex] = newSI;

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
