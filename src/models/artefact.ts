import { Polygon } from '@/utils/Polygons';
import { ArtefactDTO } from '@/dtos/sqe-dtos';
import { Side } from './misc';
import { ArtefactTextFragmentData, InterpretationRoi, SignInterpretation } from './text';
import { BoundingBox } from '@/utils/helpers';
import { Placement } from '@/utils/Placement';
import { Point } from '@/utils/helpers';
import { StateManager } from '@/state';
import { TimeoutError } from '@microsoft/signalr';

export class Artefact {
    // Default values specified to remove an error - we initialize them in the constructor or in copyFrom.
    // Typescript does not approve of that and shows an error, because it doesn't analyze copyFrom.
    public id = 0;
    public editionId = 0;
    public imagedObjectId = '';
    public name = '';
    public mask: Polygon = new Polygon('');
    public artefactMaskEditorId = 0;
    public isPlaced: boolean = false;
    public placement: Placement = Placement.empty;
    public artefactPlacementEditorId: number | undefined;
    public side: Side = 'recto';

    public textFragments: ArtefactTextFragmentData[] = [];

    public rois: InterpretationRoi[] = []; // ROIs for this artefact
    public deleteRois: InterpretationRoi[] = []; // Any ROIs that should be deleted from artefact
    public signInterpretations: SignInterpretation[] = []; // Sign Interpretations for this artefact

    constructor(obj: ArtefactDTO) {
        this.id = obj.id;
        this.editionId = obj.editionId;
        this.imagedObjectId = obj.imagedObjectId || '';
        this.name = obj.name;
        this.mask = Polygon.fromWkt(obj.mask);
        this.artefactMaskEditorId = obj.artefactMaskEditorId;
        this.isPlaced = obj.isPlaced;
        this.placement = new Placement(obj.placement);
        this.artefactPlacementEditorId = obj.artefactPlacementEditorId;
        this.side = (obj.side === 'recto') ? 'recto' : 'verso';
    }

    public get isVirtual() {
        return !this.imagedObjectId;
    }

    public get inViewport(): boolean {

        if (!this.isPlaced) {
            return false;
        }

        const viewport = StateManager.instance.scrollEditor.viewport;
        if (!viewport) {
            return false;
        }
        // TODO: delete this
        return true;

        const actualPoints = this.calculateNewPoints();

        const x2 = viewport!.x + viewport!.width;
        const y2 = viewport!.y + viewport!.height;

        const inside = (x: number, y: number) => {
            return     viewport!.x <= x && x <= x2
                    && viewport!.y <= y && y <= y2;
        };

        // top lrft
        if (inside(actualPoints.x, actualPoints.y)) {
            return true;
        }

        // top right
        if (inside(actualPoints.x + actualPoints.width,
                   actualPoints.y)) {
            return true;
        }

        // bottom left
        if (inside(actualPoints.x,
                    actualPoints.y + actualPoints.height)) {
            return true;
        }

        // bottom right
        if (inside(actualPoints.x + actualPoints.width,
                    actualPoints.y + actualPoints.height)) {
            return true;
        }

        return false;
    }


    private getArtefactCenter(): Point {
        // The artefact's center is the translate (x,y) + the bounding box's center
        const x = this.placement.translate.x! +
                  this.boundingBox.width / 2;
        const y = this.placement.translate.y! +
                  this.boundingBox.height / 2;

        return { x, y };
    }


    public calculateNewPoints(): BoundingBox {

        const theta = this.placement.rotate * Math.PI / 180;

        // Find the middle rotating point
        const center = this.getArtefactCenter();

        // Find all the corners relative to the center
        const cornersX = [
            this.placement.translate.x! - center.x!,
            this.placement.translate.x! - center.x!,
            this.placement.translate.x! +
                this.boundingBox.width! - center.x!,
            this.placement.translate.x! +
                this.boundingBox.width! - center.x!
        ];

        const cornersY = [
            this.placement.translate.y! - center.y!,
            this.placement.translate.y! +
                this.boundingBox.height! - center.y!,
            center.y! - this.placement.translate.y!,
            this.placement.translate.y! +
                this.boundingBox.height! - center.y!
        ];

        // Find new the minimum corner X and Y by taking the minimum of the bounding box
        let newX = 1e10;
        let newY = 1e10;
        const sinTeta = Math.sin(theta);
        const cosTeta = Math.cos(theta);

        for (let i = 0; i < 4; i = i + 1 ) {
            newX = Math.min(
                    newX,
                    cornersX[i] * cosTeta -
                        cornersY[i] * sinTeta + center.x!
                );
            newY = Math.min(
                    newY,
                    cornersX[i] * sinTeta +
                        cornersY[i] * cosTeta + center.y!
                );

        }

        // new width and height
        const newWidth = (center.x! - newX) * 2;
        const newHeight = ( center.y! - newY) * 2;

        return new BoundingBox ( newX, newY, newWidth , newHeight);

    }

    // TBD: Perhaps rename to setTransformation, or maybe even drop this function entirely
    // and manipulate mask from the outside
    public placeOnScroll(placement: Placement) {
        this.placement = placement.clone();
        this.isPlaced = true;
    }

    public get boundingBox(): BoundingBox {
        return this.mask.getBoundingBox();
    }

    public clonePlacement(): Placement {
        return this.placement.clone();
    }

    public prepareForBackend() {
        // Gets the artefact ready for saving - round all numbers that are supposed to be integers
        if (this.placement.translate.x) {
            this.placement.translate.x = Math.round(this.placement.translate.x);
        }

        if (this.placement.translate.y) {
            this.placement.translate.y = Math.round(this.placement.translate.y);
        }
    }

    public copyFrom(other: Artefact) {
        this.id = other.id;
        this.editionId = other.editionId;
        this.imagedObjectId = other.imagedObjectId;
        this.name = other.name;
        this.mask = other.mask;
        this.artefactMaskEditorId = other.artefactMaskEditorId;
        this.isPlaced = other.isPlaced;
        this.placement = other.placement;
        this.artefactPlacementEditorId = other.artefactPlacementEditorId;
        this.side = other.side;

        this.textFragments = [...other.textFragments];
    }
}
