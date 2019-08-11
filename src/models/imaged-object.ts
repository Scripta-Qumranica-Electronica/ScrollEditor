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
            const artefacts = obj.artefacts.map((dto) => new Artefact(dto));
            this.artefacts = artefacts;
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
