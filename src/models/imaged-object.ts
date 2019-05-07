import { ImageStack } from './image';
import { Artefact } from './artefact';
import { ImagedObjectDTO } from '@/dtos/imaged-object';

/*
export class ArtefactRef {
    public name: string;
    public id: number;

    constructor(obj: any) {
        this.name = obj.name;
        this.id = obj.artefact_id;
    }
}

// This class is a mistake, and should be removed soon
export class ImagedObjectSimple {
    public id: string;
    public recto: ImageSet;
    public verso: ImageSet;
    public artefacts: Artefact[];

    constructor(obj: any) {
        this.id = obj.id;
        this.recto = obj.recto && new IAAImageSet(obj.recto);
        this.verso = obj.verso && new IAAImageSet(obj.verso);
        const arts: any[] = obj.artefacts || [];
        this.artefacts = arts.map((a: any) => new Artefact(a));
    }
}

// This class is a mistake, and should be removed soon
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
*/

export class ImagedObject {
    public id: string;
    public recto?: ImageStack;
    public verso?: ImageStack;

    public artefacts: Artefact[];

    constructor(obj: ImagedObjectDTO) {
        this.id = obj.id;

        if (obj.artefacts) {
            this.artefacts = obj.artefacts.map((dto) => new Artefact(dto));
        } else {
            this.artefacts = [];
        }

        if (obj.recto && obj.recto.id) { // For now the backend returns id=null if the side is missing
            this.recto = new ImageStack(obj.recto);
        }
        if (obj.verso && obj.verso.id) {
            this.verso = new ImageStack(obj.verso);
        }
    }
}
