import { Polygon } from '@/utils/Polygons';
import { ImagedObject } from './imaged-object';
import { ArtefactDTO, PlacementDTO} from '@/dtos/sqe-dtos';
import { Side } from './misc';
import { ArtefactTextFragmentData } from './text';
import { BoundingBox } from '@/utils/helpers';
import { Placement } from '@/utils/Placement';

export class Artefact {
    // Default values specified to remove an error - we initialize them in the constructor or in copyFrom.
    // Typescript does not approve of that and shows an error, because it doesn't analyze copyFrom.
    public id = 0;
    public editionId = 0;
    public imagedObjectId = '';
    public name = '';
    public mask: Polygon = new Polygon('');
    public artefactMaskEditorId = 0;
    public isPlaced: boolean;
    public placement: Placement;
    public artefactPlacementEditorId: number | undefined;
    public side: Side = 'recto';

    public textFragments: ArtefactTextFragmentData[] = [];


    constructor(obj: Artefact | ArtefactDTO) {
        if (obj instanceof Artefact) {
            this.copyFrom(obj as Artefact);
            return;
        }

        this.id = obj.id;
        this.editionId = obj.editionId;
        this.imagedObjectId = obj.imagedObjectId;
        this.name = obj.name;
        this.mask = Polygon.fromWkt(obj.mask);
        this.artefactMaskEditorId = obj.artefactMaskEditorId;
        this.isPlaced = obj.isPlaced;
        this.placement = new Placement(obj.placement);
        this.artefactPlacementEditorId = obj.artefactPlacementEditorId;
        this.side = (obj.side === 'recto') ? 'recto' : 'verso';
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

    private copyFrom(other: Artefact) {
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
