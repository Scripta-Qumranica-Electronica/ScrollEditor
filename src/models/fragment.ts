import { IIAImageSet } from './image';

export class ArtefactRef {
    public name: string;
    public id: number;

    constructor(obj: any) {
        this.name = obj.name;
        this.id = obj.artefact_id;
    }
}

export class Fragment {
    public id: number;
    public institution: string;
    public artefacts: ArtefactRef[];
    public plate: string;

    public recto?: IIAImageSet;
    public verso?: IIAImageSet;

    constructor(obj: any) {
        this.id = parseInt(obj.fragment, 10);
        this.institution = obj.institution;
        if (obj.artefacts) {
            const artefacts = JSON.parse(obj.artefacts);
            this.artefacts = artefacts.map((subObj: any) => new ArtefactRef(subObj));
        } else {
            this.artefacts = [];
        }
        this.plate = obj.plate;

        const sides = JSON.parse(obj.sides);
        if (sides.recto) {
            this.recto = new IIAImageSet(sides.recto);
        }

        if (sides.verso) {
            this.verso = new IIAImageSet(sides.verso);
        }
    }
}
