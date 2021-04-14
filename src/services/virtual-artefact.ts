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
import { Point } from '@/utils/helpers';

type SignROI = [Sign, InterpretationRoi | undefined];
type Anchor = 'left' | 'right';
export class VirtualArtefactEditor {
    private originalArtefact: Artefact;
    private shadowArtefact: Artefact;
    private shadowTextFragment: TextFragment;
    private originSignROIs: SignROI[];
    private shadowSignROIs: SignROI[];
    private breakAtEnd = false;  // When true, a BREAK sign needs to be added to the end
    private disposed = false;

    // Measurements for building ROIs
    private anchor: Anchor;  // Anchor artefact text to Left, Right or Both
    private maxWidth?: number; // Maximum width of artefact - undefined if there isn't any
    private base: Point;    // Base point of first ROI - X is the right/left corner, y is the character's baseline.

    private get script() {
        return this.$state.editions.current!.script!;
    }

    private get $state() {
        return StateManager.instance;
    }

    public constructor(originalArtefact: Artefact) {
        if (!this.$state.editions.current?.script) {
            throw new Error(`Can't edit a virtual artefact with no script - in edition ${this.$state.editions.current?.id}`);
        }

        this.originalArtefact = originalArtefact;
        this.shadowArtefact = this.createShadowArtefact();
        this.$state.artefacts.add(this.shadowArtefact);
        this.shadowTextFragment = this.createShadowTextFragment();
        this.$state.textFragments.put(this.shadowTextFragment);
        this.originSignROIs = this.getOriginalSignROIs();
        this.shadowSignROIs = this.populateShadows();

        [this.anchor, this.base, this.maxWidth] = this.getBaseMeasurements();
        this.reportROIs();
    }

    public dispose() {
        if (this.disposed) {
            console.warn("Can't dispost a VirtualArtefactEditor twice");
            return;
        }

        // Remove all sign interpretations and ROIs
        for (const signROI of this.shadowSignROIs) {
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
        function signChar(si: SignInterpretation) {
            if (si.signType[1] === 'SPACE') {
                return ' ';
            }
            return si.character || '';
        }
        return this.shadowSignROIs.map(sr => signChar(sr[0].signInterpretations[0])).join('');
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
        const origin = this.originSignROIs;
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
            while (nextSI && (nextSI.signType[1] === 'SPACE')) {
                signROIs.push([nextSI.sign, undefined]);
                nextSI = this.nextSI(nextSI);
            }

            if (!nextSI && i !== this.originalArtefact.rois.length - 1) {
                throw new Error('Ran out of sign interpretations even though we are not at the end of the artefact');
            }

            if (nextSI && nextSI.signType[1] === 'BREAK') {
                this.breakAtEnd = true; // Need to add a break sign at the end of the artefact
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
            attributes: [...originalSI.attributes],
            rois: [],
        }, sign);

        sign.signInterpretations = [si];

        return sign;
    }

    private shadowROI(roi: InterpretationRoi, si: SignInterpretation) {
        const shadow = InterpretationRoi.new(this.shadowArtefact, si, roi.shape, roi.position, roi.rotation);

        return shadow;
    }

    private getBaseMeasurements(): [Anchor, Point, number?] {
        // Getting the base measurements is delicate.
        const origin = this.originSignROIs;
        const defaultBaseline = this.originalArtefact.boundingBox.height - 5;

        // If the artefact has no signs at all, keep it the same size, anchor to the right - by default
        if (!origin.length) {
            return ['right', {
                x: this.originalArtefact.boundingBox.width,
                y: defaultBaseline,
            }, this.originalArtefact.boundingBox.width];
        }

        // An anchor is a sign to the left or right of the virtual artefact, that fixes the
        // position of the virtual artefact.
        function getAnchors(): [Anchor, Sign?, Sign?] {
            const line = origin[0][0].line;
            let rightAnchor: Sign | undefined;  // tslint:disable-line

            const firstSign = origin[0][0];
            if (firstSign.indexInLine > 0) {
                // The artefact has a right anchor if the first sign is not the first in line
                rightAnchor = line.signs[firstSign.indexInLine - 1];
            }

            let leftAnchor: Sign | undefined;  // tslint:disable-line
            const lastSign = origin[origin.length - 1][0];
            if (lastSign.indexInLine !== line.signs.length - 1) {
                // The artefact has a left anchor if the last sign is not the last in line
                // There may be another sign past the last sign, signifying a line break, which still means
                // the last sign is the last in line, and the artefact is not anchored.

                const nextSign = line.signs[lastSign.indexInLine + 1];
                if (nextSign.signInterpretations[0].signType[1] !== 'BREAK') {
                    leftAnchor = nextSign;
                }
            }

            return [rightAnchor ? 'right' : 'left', leftAnchor, rightAnchor];
        }
        const [anchor, leftAnchor, rightAnchor] = getAnchors();

        const maxWidth = rightAnchor && leftAnchor ? this.originalArtefact.boundingBox.width : undefined;

        // We need the baseline of the artefact, which is the baseline of any of the existing signs on the
        // artefact (or the default if there is none)
        const script = this.script; // Used for the closure of the inner function
        function getBaseline() {
            const firstSR = origin.find(sr => !!sr[1]);
            if (!firstSR) { // No ROI at all
                return defaultBaseline;
            }
            return firstSR[1]!.position.y;
        }
        const baseY = getBaseline();

        // The base X point is the artefact's left corner if we anchor to the left, or its right
        // corner if we anchor to the right

        const baseX = this.originalArtefact.placement!.translate.x + (anchor === 'right' ? this.originalArtefact.boundingBox.width : 0);
        return [anchor, { x: baseX, y: baseY }, maxWidth];
    }

    private calcArtefactWidth() {
        let width = 0;
        let trailingSpaces = 0;

        let prevSI: SignInterpretation | undefined;
        for (const sr of this.shadowSignROIs) {
            const si = sr[0].signInterpretations[0];
            if (si.signType[1] === 'SPACE') {
                width += this.script.wordSpace;
                trailingSpaces += this.script.wordSpace;
                prevSI = undefined;
                continue;
            }

            if (prevSI && prevSI.signType[1] === 'LETTER') {
                const kerning = this.script.getKerning(prevSI.character!, si.character!);
                width += kerning?.xKern || 0;
            }

            width += this.script.glyphs[si.character!]!.shape.getBoundingBox().width;
            trailingSpaces = 0;
            prevSI = si;
        }

        width -= trailingSpaces;  // There is an issue in the backend, it doesn't take trailing spaces into account

        return width;
    }
    /* private fillROIs() {
        // Fill the ROIs based on the sign stream, using the base measurements

        // First thing, clear the existing ROIs
        for (const sr of this.shadowSignROIs) {
            if (sr[1]) {
                this.$state.interpretationRois.delete(sr[1].id);
                sr[1] = undefined;
            }
        }

        let x = this.base.x;
        for (const sr of this.shadowSignROIs) {
            const sign = sr[0];

        }
    } */

    private reportROIs() {
        console.debug(`Anchor ${this.anchor}, base: (${this.base.x}, ${this.base.y})`);
        console.debug(`Dimensions: width ${this.originalArtefact.boundingBox.width}, height: ${this.originalArtefact.boundingBox.height}`);

        for (const sr of this.shadowSignROIs) {
            const si = sr[0].signInterpretations[0];
            if (!sr[1]) {
                console.debug(`${sr[0].indexInLine}: ${si.signType[1]}`);
            } else {
                const glyph = this.script.glyphs[si.character || ' '];
                console.debug(`${sr[0].indexInLine}: '${si.character}' at (${sr[1].position.x}, ${sr[1].position.y}) ${sr[1].shape.wkt} ${glyph.shape.getBoundingBox()} ${glyph.yOffset}`);
            }
        }

        const calculatedWidth = this.calcArtefactWidth();
        console.debug(`Calculated width: ${calculatedWidth}`);
    }
}
