import { Polygon } from '@/utils/Polygons';
import { ImagedObject } from './imaged-object';
import { ArtefactDTO } from '@/dtos/sqe-dtos';
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
    public mask: Mask = {} as Mask;
    // public mask = {} as Polygon;
    // public transformMatrix = undefined as any; // TODO: Change to matrix type?
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
