import { Polygon } from '@/utils/Polygons';
import { ImagedObject } from './imaged-object';
import { ArtefactDTO } from '@/dtos/artefact';
import { Side } from './misc';


export class Artefact {
    // Default values specified to remove an error - we initialize them in the constructor or in copyFrom.
    // Typescript does not approve of that and shows an error, because it doesn't analyze copyFrom.
    public id = 0;
    public editionId = 0;
    public imagedObjectId = '';
    public name = '';
    public mask = {} as Polygon;
    public zOrder = 0;
    public side: Side = 'recto';


    constructor(obj: Artefact | ArtefactDTO) {
        if (obj instanceof Artefact) {
            this.copyFrom(obj as Artefact);
            return;
        }

        this.id = obj.id;
        this.editionId = obj.editionId;
        this.imagedObjectId = obj.imagedObjectId;
        this.name = obj.name;
        this.mask = obj.mask ? Polygon.fromWkt(obj.mask.mask) : {} as Polygon;
        this.zOrder = obj.zOrder;
        this.side = (obj.side === 'recto' || obj.side === 0) ? 'recto' : 'verso';
    }

    private copyFrom(other: Artefact) {
        this.id = other.id;
        this.editionId = other.editionId;
        this.imagedObjectId = other.imagedObjectId;
        this.name = other.name;
        this.mask = other.mask;
        this.zOrder = other.zOrder;
        this.side = other.side;
    }
}
