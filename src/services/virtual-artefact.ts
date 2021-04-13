/*
 * This module contains the logic for editing virtual artefacts.
 *
 * Virtual artefacts are rectangular artefacts that contains signs and ROIs. The signs belong
 * to a single text-fragment (which may contain text of other virtual artefacts as well).
 *
 * Editing the text of a virtual artefact is done by creating a front-end only shadow artefact and shadow text fragment.
 * These shadow models contain a copy of the original virtual artefact. The original virtual artefact is hidden, and the
 * shadow artefact is displayed.
 *
 * Editing happens on the shadow artefact and text fragment. After editing is done, the shadow artefact and text fragment are
 * removed, and the original artefact and text fragment are updated by the server.
 */

import { Artefact } from '@/models/artefact';
import { InterpretationRoi, Sign, SignInterpretation, TextFragment } from '@/models/text';
import { StateManager } from '@/state';

type SignROI = [Sign, InterpretationRoi | undefined];

export class VirtualArtefactEditor {
    private originalArtefact: Artefact;
    private shadowArtefact: Artefact;
    private shadowTextFragment: TextFragment;
    private signROIs: SignROI[];
    private disposed = false;

    private get $state() {
        return StateManager.instance;
    }

    public constructor(originalArtefact: Artefact) {
        this.originalArtefact = originalArtefact;
        this.shadowArtefact = this.createShadowArtefact();
        this.$state.artefacts.add(this.shadowArtefact);
        this.shadowTextFragment = this.createShadowTextFragment();
        this.$state.textFragments.put(this.shadowTextFragment);

        this.signROIs = this.populateShadows();
    }

    public dispose() {
        if (this.disposed) {
            console.warn("Can't dispost a VirtualArtefactEditor twice");
            return;
        }

        // Remove all sign interpretations and ROIs
        for (const signROI of this.signROIs) {
            this.$state.signInterpretations.delete(signROI[0].signInterpretations[0].id);

            if (signROI[1]) {
                this.$state.interpretationRois.delete(signROI[1].id);
            }
        }

        // Remove the shadow models
        this.$state.artefacts.remove(this.shadowArtefact.id);
        this.$state.textFragments.delete(this.shadowTextFragment.id);
        this.disposed = true;
    }

    public get text(): string {
        return this.signROIs.map(sr => sr[0].signInterpretations[0].character || ' ').join('');
    }

    private createShadowArtefact() {
        const artefact = new Artefact({
            id: -1717171717,
            editionId: this.originalArtefact.editionId,
            imagedObjectId: '',
            imageId: -1,
            artefactDataEditorId: -1,
            name: 'shadow artefact',
            mask: this.originalArtefact.mask.wkt,
            artefactMaskEditorId: -1,
            isPlaced: true,
            placement: this.originalArtefact.placement,
            side: this.originalArtefact.side,
        });

        return artefact;
    }

    private createShadowTextFragment() {
        const textFragment = new TextFragment({
            textFragmentId: -1717171717,
            textFragmentName: 'shadow text fragment',
            editorId: -1,
            lines: [{
                lineId: 1,
                lineName: 'shadow line',
                editorId: -1,
                signs: []
            }]
        });

        return textFragment;
    }

    private populateShadows() {
        const origin = this.getOriginalSignROIs();
        const shadow: SignROI[] = [];

        // First we create new signs and sign interpretations for the new artefact
        let prevSign: Sign | undefined;
        for (const [idx, signROI] of origin.entries()) {
            const sign = this.shadowSign(signROI[0], idx);

            this.shadowTextFragment.lines[0].addSign(sign);
            if (prevSign) {
                prevSign.signInterpretations[0].nextSignInterpretations = [{
                    creatorId: -1,
                    editorId: -1,
                    nextSignInterpretationId: sign.signInterpretations[0].id
                }];
            }
            prevSign = sign;
            shadow.push([sign, undefined]);
        }

        // Now, create the new ROIs
        for (const [idx, signROI] of origin.entries()) {
            if (signROI[1]) {
                const roi = this.shadowROI(signROI[1], signROI[0].signInterpretations[0]);

                shadow[idx][1] = roi;
                this.$state.interpretationRois.put(roi);
            }
        }

        // Map the ROIs into the shadow sign interpretaitons
        for (const signROI of shadow) {
            if (signROI[1]) {
                signROI[0].signInterpretations[0].rois = [signROI[1]];
            }
            this.$state.signInterpretations.put(signROI[0].signInterpretations[0]);
        }

        return shadow;
    }

    private getOriginalSignROIs(): SignROI[] {
        const signROIs: SignROI[] = [];

        if (this.originalArtefact.rois.length !== this.originalArtefact.signInterpretations.length) {
            throw new Error('Virtual artefact mismatch - number of ROIs is not the same as number of SIs');
        }

        for (let i = 0; i < this.originalArtefact.rois.length; i++) {
            const roi = this.originalArtefact.rois[i];
            const si = this.originalArtefact.signInterpretations[i];

            const associatedSi = this.ROItoSI(roi);  // Sanity check
            if (si !== associatedSi) {
                throw new Error('Out of sync scanning ROIs and SIs');
            }
            signROIs.push([si.sign, roi]);

            // Now, scan the next SIs in the text fragment, to find all SPACE signs, which are
            // not part of the virtual artefact, but should be part of the text
            let nextSI = this.nextSI(si);
            while (nextSI && nextSI.signType[1] === 'SPACE') {
                signROIs.push([nextSI.sign, undefined]);
                nextSI = this.nextSI(nextSI);
            }

            if (!nextSI && i !== this.originalArtefact.rois.length - 1) {
                throw new Error('Ran out of sign interpretations even though we are not at the end of the artefact');
            }
        }

        return signROIs;
    }

    private ROItoSI(roi: InterpretationRoi) {
        // Returns the first ROI and SI of the original artefact
        if (!roi.signInterpretationId) {
            console.error(`Can't locate sign interpretations in roi ${roi.id}`);
            this.$state.corrupted('Virtual Artefact has been corrupted');
        }

        const si = this.$state.signInterpretations.get(roi.signInterpretationId!);
        return si;
    }

    private nextSI(si: SignInterpretation) {
        if (si.nextSignInterpretations.length !== 1) {
            throw Error('Expected exactly 1 nextSignInterpretation');
        }
        const nextId = si.nextSignInterpretations[0].nextSignInterpretationId;
        const nextSI = this.$state.signInterpretations.get(nextId);
        return nextSI;
    }

    private shadowSign(original: Sign, indexInLine: number) {
        if (original.signInterpretations.length !== 1) {
            throw new Error('Expected a sign with only one SignInterpretaetion');
        }

        const originalSI = original.signInterpretations[0];
        const sign = new Sign({ signInterpretations: [] }, this.shadowTextFragment.lines[0], indexInLine);
        const si = new SignInterpretation({
            signId: -1,   // Patch, we don't really need the signID, but the DTO requires it
            character: originalSI.character,
            isVariant: false,
            signInterpretationId: SignInterpretation.nextAvailableId,
            nextSignInterpretations: [],
            attributes: [],
            rois: [],
        }, sign);

        sign.signInterpretations = [si];

        return sign;
    }

    private shadowROI(roi: InterpretationRoi, si: SignInterpretation) {
        const shadow = InterpretationRoi.new(this.shadowArtefact, si, roi.shape, roi.position, roi.rotation);

        return shadow;
    }
}
