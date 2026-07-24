import { ImagedObjectEditorParams } from '@/views/imaged-object-editor/types';
import { currentState } from './current';

function state() {
    return currentState();
}

export class ImagedObjectState {
    public params: ImagedObjectEditorParams | null = null;

    constructor() {
        this.params = new ImagedObjectEditorParams();
    }
}
