import { Polygon } from '@/utils/Polygons';
import { ArtefactDTO } from '@/dtos/sqe-dtos';
import { Side } from './misc';
import { ArtefactTextFragmentData, InterpretationRoi, SignInterpretation } from './text';
import { BoundingBox } from '@/utils/helpers';
import { Placement } from '@/utils/Placement';
// import { StateManager } from '@/state/.';
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

        const x2 = viewport!.x + viewport!.width;
        const y2 = viewport!.y + viewport!.height;

        function inside(x: number, y: number) {
            return viewport!.x <= x && x <= x2 && viewport!.y <= y && y <= y2;
        }

        if (inside(this.placement.translate.x, this.placement.translate.y)) {
            return true;
        }

        if (inside(this.placement.translate.x + this.boundingBox.width, this.placement.translate.y)) {
            return true;
        }

        if (inside(this.placement.translate.x, this.placement.translate.y + this.boundingBox.height)) {
            return true;
        }

        if (inside(this.placement.translate.x + this.boundingBox.width, this.placement.translate.y + this.boundingBox.height)) {
            return true;
        }

        return false;
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
