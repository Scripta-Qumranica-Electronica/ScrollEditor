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

import { DiffReconstructedResponseDTO, DiffReplaceReconstructionRequestDTO, DiffReplaceRequestDTO, DiffReplaceResponseDTO, IndexedReplacementTextRoi, KernPairDTO, SetReconstructedInterpretationRoiDTO, TranslateDTO } from '@/dtos/sqe-dtos';
import { Artefact } from '@/models/artefact';
import { EditionInfo } from '@/models/edition';
import { InterpretationRoi, Line, Sign, SignInterpretation, TextFragment } from '@/models/text';
import { StateManager } from '@/state';
import { NotificationHandler } from '@/state/notification-handler';
import { BoundingBox, Point } from '@/utils/helpers';
import { Placement } from '@/utils/Placement';
import { Polygon } from '@/utils/Polygons';
import { ApiRoutes } from './api-routes';
import { CommHelper } from './comm-helper';

type SignROI = [Sign, InterpretationRoi | undefined];
type Anchor = 'left' | 'right';
export class VirtualArtefactEditor {
    private originalArtefact: Artefact;
    private shadowArtefact: Artefact;
    private shadowTextFragment: TextFragment;
    private originSignROIs: SignROI[];
    private shadowSignROIs: SignROI[] = [];
    private breakAtEnd = false;  // When true, a BREAK sign needs to be added to the end
    private _text = '';
    private hidden = false;

    // Measurements for building ROIs
    private anchor: Anchor;  // Anchor artefact text to Left, Right or Both
    private maxWidth?: number; // Maximum width of artefact - undefined if there isn't any
    private anchorPoint: Point; // Anchor point nn the manuscript, the artefact will always start there - top left or top right, depending on anchor
    private baseline: number; // Baseline height inside the artefact

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
        this._text = this.extractOriginalText();
        // this.shadowSignROIs = this.populateShadowSigns();

        [this.anchor, this.anchorPoint, this.baseline, this.maxWidth] = this.getBaseMeasurements();

        this.populateShadows();

        // this.reportROIs();
    }

    public hide() {
        if (this.hidden) {
            console.warn("Can't hide a VirtualArtefactEditor twice");
            return;
        }

        this.clearShadowModels(true); // Keep the ROI arrays intact

        // Remove the shadow models
        this.$state.artefacts.remove(this.shadowArtefact.id);
        this.$state.textFragments.delete(this.shadowTextFragment.id);
        this.hidden = true;
    }

    public get text() {
        return this._text;
    }

    public set text(newText: string) {
        this._text = newText;
        this.populateShadows();
        console.debug('virtual artefact editor text: ', newText);
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

    private extractOriginalText(): string {
        function signChar(si: SignInterpretation) {
            if (si.signType[1] === 'SPACE') {
                return ' ';
            }
            return si.character || '';
        }
        return this.originSignROIs.map(sr => signChar(sr[0].signInterpretations[0])).join('');
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

    private getBaseMeasurements(): [Anchor, Point, number, number?] {
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
            if (firstSign.indexInLine !== 0) {
                // The artefact has a right anchor if it is first in line, or the only
                // sign before it is a break;
                const prevSign = line.signs[firstSign.indexInLine - 1];
                if (prevSign.signInterpretations[0].signType[1] !== 'BREAK') {
                    rightAnchor = line.signs[firstSign.indexInLine - 1];
                }
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
        // The base X point is the artefact's left corner if we anchor to the left, or its right
        // corner if we anchor to the right

        const baseX = this.originalArtefact.placement!.translate.x + (anchor === 'right' ? this.originalArtefact.boundingBox.width : 0);
        const baseY = this.originalArtefact.placement!.translate.y;
        return [anchor, { x: baseX, y: baseY }, getBaseline(), maxWidth];
    }

    private populateShadows() {
        this.clearShadowModels();
        this.populateShadowSigns();
        this.populateShadowROIs();
        this.registerShadowModels();
        this.placeShadowArtefact();
    }

    private clearShadowModels(unregisterOnly = false) {
        for (const sr of this.shadowSignROIs) {
            this.$state.signInterpretations.delete(sr[0].signInterpretations[0].id);
            if (sr[1]) {
                this.$state.interpretationRois.delete(sr[1].id);
            }
        }

        if (!unregisterOnly) {
            this.shadowSignROIs = [];
            this.shadowTextFragment.lines[0].signs = [];
        }
    }

    private attachSign(prev: Sign | undefined, next: Sign) {
        if (!prev) {
            return;
        }

        prev.signInterpretations[0].nextSignInterpretations = [{
            creatorId: -1,
            editorId: -1,
            nextSignInterpretationId: next.signInterpretations[0].id
        }];
    }

    private createShadowSign(char: string, idx: number, type?: string) {
        const sign = new Sign({ signInterpretations: [] }, this.shadowTextFragment.lines[0], idx);

        const si = new SignInterpretation({
                        signId: -1,   // Patch, we don't really need the signID, but the DTO requires it
                        character: char,
                        isVariant: false,
                        signInterpretationId: SignInterpretation.nextAvailableId,
                        nextSignInterpretations: [],
                        attributes: [],
                        rois: [],
                    }, sign);
        sign.signInterpretations = [si];

        if (!type) {
            type = char === ' ' ? 'SPACE' : 'LETTER';
        }
        const typeId = type === 'LETTER' ? 1 : type === 'BREAK' ? 4 : 2;
        si.signType = [typeId, type];

        return sign;
    }

    private populateShadowSigns() {
        if (this.shadowSignROIs.length) {
            throw new Error('popualteShadowSign must be called with an empty shadowSignROIs list');
        }

        let prevSign: Sign | undefined;

        for (let idx = 0; idx < this.text.length; idx++) {
            const char = this.text[idx];
            const sign = this.createShadowSign(char, idx);
            this.attachSign(prevSign, sign);
            prevSign = sign;

            this.shadowSignROIs.push([sign, undefined]);
        }
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

            if (prevSI) {
                const kerning = this.script.getKerning(prevSI.character!, si.character!);
                width += kerning?.xKern || 0;
            }

            width += this.script.glyphs[si.character!]!.boundingBox.width;
            trailingSpaces = 0;
            prevSI = si;
        }

        width -= trailingSpaces;  // There is an issue in the backend, it doesn't take trailing spaces into account

        return width;
    }

    private populateShadowROIs() {
        // Fill the ROIs based on the sign stream, using the base measurements

        // First thing, clear the existing ROIs
        for (const sr of this.shadowSignROIs) {
            if (sr[1]) {
                this.$state.interpretationRois.delete(sr[1].id);
                sr[1] = undefined;
            }
        }

        // Now create all the ROIs
        const width = this.calcArtefactWidth();
        let rightX = width;  // rightX of next ROI
        let prevSI: SignInterpretation | undefined;
        for (const sr of this.shadowSignROIs) {
            const si = sr[0].signInterpretations[0];
            if (si.signType[1] === 'SPACE') {
                // In case of space, add no ROI, just push the X coordinate
                rightX -= this.script.wordSpace;
                prevSI = undefined;
                continue;
            }

            const gd = this.script.glyphs[si.character || 'א']; // Glyph data of sign

            let kerning: KernPairDTO | undefined; // Kerning between this sign and the previous sign
            if (prevSI) {
                kerning = this.script.getKerning(prevSI.character!, si.character!);
            }

            rightX -= kerning?.xKern || 0;

            // Now we can create the ROI
            // We basically replicate the same calculation done in the backend
            const roiPosition = { x: rightX - gd.boundingBox.width, y: this.baseline };
            const roiBox: BoundingBox = {
                x: 0,
                y: -gd.yOffset - (kerning?.yKern || 0),
                width: gd.boundingBox.width,
                height: gd.boundingBox.height,
            };
            const roiShape = Polygon.fromBox(roiBox);

            const roi = InterpretationRoi.new(this.shadowArtefact, si, roiShape, roiPosition, 0);
            si.rois = [roi];
            sr[1] = roi;

            rightX = roiPosition.x;
            prevSI = si;
        }
    }

    private registerShadowModels() {
        for (const sr of this.shadowSignROIs) {
            if (sr[1]) {
                this.$state.interpretationRois.put(sr[1]);
            }
            this.$state.signInterpretations.put(sr[0].signInterpretations[0]);
        }
    }

    private placeShadowArtefact() {
        const width = this.calcArtefactWidth();
        const top = this.anchorPoint.y;
        const left = this.anchorPoint.x - (this.anchor === 'right' ? width : 0);
        const height = this.originalArtefact.boundingBox.height;

        // Now we place the artefact at (top, left) and set its shape to the box
        this.shadowArtefact.placement.translate = { x: left, y: top };
        this.shadowArtefact.mask = Polygon.fromBox( { x: 0, y: 0, width, height });
    }

    public async updateText() {
        const url = ApiRoutes.diffReplaceTranscription(this.originalArtefact.editionId, this.originalArtefact.id);
        const rois: IndexedReplacementTextRoi[] = [];

        // Gather the ROIs of non-space characters
        for (const [index, signRoi] of this.shadowSignROIs.entries()) {
            const roi = signRoi[1];
            if (!roi) {
                continue;
            }

            const roiDTO: IndexedReplacementTextRoi = {
                index,
                roi: {
                    shape: roi.shape.wkt,
                    translate: roi.position,
                } as SetReconstructedInterpretationRoiDTO,
            };

            rois.push(roiDTO);
        }

        const dto: DiffReplaceReconstructionRequestDTO = {
            textRois: rois,
            newText: this.text,
            virtualArtefactShape: this.shadowArtefact.mask.wkt,
            virtualArtefactPlacement: this.shadowArtefact.placement,
        };

        const response = await CommHelper.put<DiffReconstructedResponseDTO>(url, dto);
        console.debug('Text response: ', response.data);

        const handler = new NotificationHandler();  // This class is stateless, we can just use it.

        // First, deletions
/*        if (response.data.deleted) {
            handler.handleDeletedSignInterpretation(response.data.deleted);
        }

        // Then creations
        if (response.data.created && response.data.created.signInterpretations) {
            handler.handleCreatedSignInterpretation(response.data.created);
        }

        // And finally, updates
        if (response.data.updated && response.data.updated.signInterpretations) {
            handler.handleUpdatedSignInterpretations(response.data.updated);
        } */
    }
}
