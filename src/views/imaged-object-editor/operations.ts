import { Operation } from '@/utils/operations-manager';
import { Artefact } from '@/models/artefact';
import { Placement } from '@/utils/Placement';
import { StateManager } from '@/state';
import { Polygon } from '@/utils/Polygons';

function state() {
    return StateManager.instance;
}

export type ImagedObjectEditorOperationType = 'draw' | 'erase';

export class ImagedObjectEditorOperation implements Operation<ImagedObjectEditorOperation> {

    public prev: Polygon;
    public next: Polygon;

    public constructor(
        public artefactId: number,
        public type: ImagedObjectEditorOperationType,
        prev: Polygon,
        next: Polygon
    ) {

        this.prev = new Polygon(prev.svg);
        this.next = new Polygon(next.svg);
    }

    protected get artefact(): Artefact {
        const artefact = state().imagedObjects.current!.artefacts.find((art: Artefact) => art.id === this.artefactId);
        if (!artefact) {
            console.error('Couldn\'t find artefact with id: ' + this.artefactId);
            throw new Error('Couldn\'t find artefact with id: ' + this.artefactId);
        }
        return artefact;
    }
    public getId(): number {
        return this.artefact.id;
    }

    public undo(): void {
        this.artefact.mask = new Polygon(this.prev.svg);
    }

    public redo(): void {
        this.artefact.mask = new Polygon(this.next.svg);

    }
    public uniteWith(op: ImagedObjectEditorOperation): ImagedObjectEditorOperation | undefined {
        return undefined;
    }

}

