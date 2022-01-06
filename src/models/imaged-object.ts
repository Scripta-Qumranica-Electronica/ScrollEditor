import { ImageStack } from './image';
import { Artefact } from './artefact';
import { ImagedObjectDTO } from '@/dtos/sqe-dtos';
import { Side } from './misc';
import { EditionInfo } from './edition';

export class ImagedObject {
    public id: string;
    public recto?: ImageStack;
    public verso?: ImageStack;

    public artefacts: Artefact[];

    constructor(obj: ImagedObjectDTO, edition: EditionInfo) {
        this.id = obj.id;

        if (obj.artefacts) {
            this.artefacts = obj.artefacts.map((dto) => new Artefact(dto));
        } else {
            this.artefacts = [];
        }

        if (obj.recto && obj.recto.id !== undefined) { // For now the backend returns id=null if the side is missing
            this.recto = new ImageStack(obj.recto, edition);
        }
        if (obj.verso && obj.verso.id) {
            this.verso = new ImageStack(obj.verso, edition);
        }
    }

    public getImageStack(side: Side) {
        if (side === 'recto') {
            return this.recto;
        }
        return this.verso;
    }

    public get name(): string {
        const names = this.artefacts.map((a) => a.name);
        const unique = [...new Set(names)];
        return unique.join(', ');
    }
}
