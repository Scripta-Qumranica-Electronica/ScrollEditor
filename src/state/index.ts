import { SessionState } from './session';
import { EditionCollection,
    ImagedObjectCollection,
    MiscState,
    ArtefactCollection,
    InterpretationRoiMap,
    SignInterpretationMap,
    TextFragmentMap,
    ArtefactGroupsMap} from './utilities';
import StateService from './state-service';
import { ScrollEditorState } from './scroll-editor';
import { EventBus } from './event-bus';
import { ArtefactEditorState } from './artefact-editor';
import { ImagedObjectState } from './imaged-object';
import { OperationsManagerBase } from '@/utils/operations-manager';
import { TextFragmentState } from './text-fragment';

export class StateManager {
    private static _instance: StateManager;

    public session: SessionState;
    public editions: EditionCollection;
    public imagedObjects: ImagedObjectCollection;   // Imaged objects for the current edition
    public artefacts: ArtefactCollection;           // Artefacts for the current edition or imaged object
    public artefactGroups: ArtefactGroupsMap;
    public textFragments: TextFragmentMap;
    public interpretationRois: InterpretationRoiMap;
    public signInterpretations: SignInterpretationMap;
    public misc: MiscState;
    public scrollEditor: ScrollEditorState;
    public artefactEditor: ArtefactEditorState;
    public textFragmentEditor: TextFragmentState;
    public imagedObject: ImagedObjectState;
    public eventBus: EventBus;
    public operationsManager: OperationsManagerBase | null;

    public prepare: StateService;

     public showEditReconTextBar: boolean =  false;

    private constructor() {
        this.session = new SessionState();
        this.editions = new EditionCollection();
        this.imagedObjects = new ImagedObjectCollection();
        this.artefacts = new ArtefactCollection();
        this.artefactGroups = new ArtefactGroupsMap();
        this.textFragments = new TextFragmentMap();
        this.misc = new MiscState();
        this.scrollEditor = new ScrollEditorState();
        this.artefactEditor = new ArtefactEditorState();
        this.textFragmentEditor = new TextFragmentState();
        this.imagedObject = new ImagedObjectState();
        this.interpretationRois = new InterpretationRoiMap();
        this.signInterpretations = new SignInterpretationMap();
        this.eventBus = new EventBus();
        this.prepare = new StateService(this);
        this.operationsManager = null;
        this.showEditReconTextBar = false;
    }

    public corrupted(msg: string): never {
        console.error('State is corrupt: ', msg);
        this.eventBus.emit('corrupted-state');
        throw new Error('State is corrupt: ' + msg);
    }

    public static get instance() {
        if (!StateManager._instance) {
            StateManager._instance = new StateManager();
        }
        return StateManager._instance;
    }
}
