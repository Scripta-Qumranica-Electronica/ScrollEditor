import { Artefact } from '@/models/artefact';
import { ArtefactGroup } from '@/models/edition';
import { BoundingBox } from '@/utils/helpers';

export class ScrollEditorState {
    public selectedArtefact?: Artefact;
    public selectedGroup?: ArtefactGroup;

    public viewport?: BoundingBox;  // The viewport in edition coordinates
}
