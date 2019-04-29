import { IAAImageSet, ImageSet } from './image';
import { Artefact } from './artefact';

export class ArtefactRef {
    public name: string;
    public id: number;

    constructor(obj: any) {
        this.name = obj.name;
        this.id = obj.artefact_id;
    }
}

export class ImagedObjectSimple {
    public id: string;
    public recto: ImageSet;
    public verso: ImageSet;
    public artefacts: Artefact[];

    constructor(obj: any) {
        this.id = obj.id;
        this.recto = obj.recto && new IAAImageSet(obj.recto);
        this.verso = obj.verso && new IAAImageSet(obj.verso);
        const arts: any[] = obj.artefacts.filter ((x: any) => x.side == 0) || '[]';
        this.artefacts = arts.map((a: any) => new Artefact(a));
    }
}

export class ImagedObjectDetailed {
    public number: number;
    public institution: string;
    public artefactRefs: ArtefactRef[];
    public plate: string;

    public recto?: ImageSet;
    public verso?: ImageSet;

    public artefacts: Artefact[] | undefined;

    public get uniqueId() {
        return `${this.institution}-${this.plate}-${this.number}`;
    }

    constructor(obj: any) {
        this.number = parseInt(obj.fragment, 10);
        this.institution = obj.institution;

        if (obj.artefacts) {
            const artefacts = JSON.parse(obj.artefacts);
            this.artefactRefs = artefacts.map((subObj: any) => new ArtefactRef(subObj));
        } else {
            this.artefactRefs = [];
        }
        this.plate = obj.plate;

        const sides = JSON.parse(obj.sides);
        if (sides) { // Some imagedObjects do not have sides (Why?)
            if (sides.recto) {
                this.recto = new IAAImageSet(sides.recto);
            }

            if (sides.verso) {
                this.verso = new IAAImageSet(sides.verso);
            }
        }

        // artefacts are filled with another server call, from somewhere else
    }
}
