import { IIAImageSet } from './image';
import { Artefact } from './artefact';

export class ArtefactRef {
    public name: string;
    public id: number;

    constructor(obj: any) {
        this.name = obj.name;
        this.id = obj.artefact_id;
    }
}

export class Fragment {
    public number: number;
    public institution: string;
    public artefactRefs: ArtefactRef[];
    public plate: string;

    public recto?: IIAImageSet;
    public verso?: IIAImageSet;

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
        if (sides) { // Some fragments do not have sides (Why?)
            if (sides.recto) {
                this.recto = new IIAImageSet(sides.recto);
            }

            if (sides.verso) {
                this.verso = new IIAImageSet(sides.verso);
            }
        }

        // artefacts are filled with another server call, from somewhere else
    }
}
