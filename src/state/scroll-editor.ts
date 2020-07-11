import { Artefact } from '@/models/artefact';
import { ArtefactGroup } from '@/models/edition';

export class ScrollEditorState {
    public selectedArtefact?: Artefact;
    public selectedGroup?: ArtefactGroup;
}
