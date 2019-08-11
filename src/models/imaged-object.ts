import { ImageStack } from './image';
import { Artefact } from './artefact';
import { ImagedObjectDTO } from '@/dtos/sqe-dtos';

export class ImagedObject {
    public id: string;
    public recto?: ImageStack;
    public verso?: ImageStack;

    public artefacts: Artefact[];

    constructor(obj: ImagedObjectDTO) {
        this.id = obj.id;

        if (obj.artefacts) {
            const all = obj.artefacts.map((dto) => new Artefact(dto));

            // For now we do not support verso artefacts in the frontend
            const recto = all.filter((a) => a.side === 'recto');
            this.artefacts = recto;
        } else {
            this.artefacts = [];
        }

        if (obj.recto && obj.recto.id !== undefined) { // For now the backend returns id=null if the side is missing
            this.recto = new ImageStack(obj.recto);
        }
        if (obj.verso && obj.verso.id) {
            this.verso = new ImageStack(obj.verso);
        }
    }
}
