import { Polygon } from '@/utils/Polygons';
import { ImagedObject } from './imaged-object';
import { ArtefactDTO, TransformationDTO } from '@/dtos/sqe-dtos';
import { Side } from './misc';
import { Mask } from '@/utils/Mask';
import { ArtefactTextFragmentData } from './text';


export class Artefact {
    // Default values specified to remove an error - we initialize them in the constructor or in copyFrom.
    // Typescript does not approve of that and shows an error, because it doesn't analyze copyFrom.
    public id = 0;
    public editionId = 0;
    public imagedObjectId = '';
    public name = '';
    public mask: Mask = {} as Mask; // This is a bad name, but we keep the naming convention of the frontend.

    public zOrder = 0;
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
        this.mask = new Mask(obj.mask);
        this.zOrder = obj.zOrder;
        this.side = (obj.side === 'recto') ? 'recto' : 'verso';
    }

    public get isPlaced(): boolean {
        // Shaindel: Return true if the artefact has been placed on the scroll
        if (this.mask.transformation.translate || this.mask.transformation.scale || this.mask.transformation.rotate) {
            return true;
        } else {
            return false;
        }
    }

    // To place an artefact on the scroll - set its mask.transformation to a proper TransformationDTO
    // Set rotation to 0, scale to 1, set the translation x and y to (100 * number of placed artefacts, 400)
    public placeOnScroll(transformationDTO: TransformationDTO) {
        this.mask.transformation = {...transformationDTO};
        // this.mask.transformation.rotate = transformationDTO.rotate;
    }

    private copyFrom(other: Artefact) {
        this.id = other.id;
        this.editionId = other.editionId;
        this.imagedObjectId = other.imagedObjectId;
        this.name = other.name;
        this.mask = other.mask;
        // this.transformMatrix = other.transformMatrix;
        this.zOrder = other.zOrder;
        this.side = other.side;

        this.textFragments = [...other.textFragments];
    }
}
