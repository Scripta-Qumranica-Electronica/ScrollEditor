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
import { reactive } from 'vue';
import { _setCurrentState, _setStateManagerBuilder } from './current';

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
        // Publish the (still-constructing) singleton first, so any sub-state module
        // whose runtime code runs during construction resolves it via currentState()
        // instead of recursing back into this constructor.
        _setCurrentState(this);
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

    public touchEdition(editionId: number) {
        // Update the lastEdit of an edition

        const edition = this.editions.find(editionId);
        if (edition) {
            edition.lastEdit = new Date();
        }
    }

    public static get instance() {
        if (!StateManager._instance) {
            // Wrap the singleton in ONE shared reactive proxy so mutations to global
            // state (editions.current, collection items, model fields) drive Vue
            // re-renders. The constructor pre-registers the raw instance (for
            // reentrancy during construction); here we register the PROXY so all
            // runtime access — currentState() in services/reducers and $state in
            // templates — shares the same reactive object.
            const built = new StateManager();
            StateManager._instance = reactive(built) as StateManager;
            _setCurrentState(StateManager._instance);
        }
        return StateManager._instance;
    }
}

// Let currentState() lazily build the singleton on first access without importing
// this concrete class (which would recreate the cycle we are breaking).
_setStateManagerBuilder(() => StateManager.instance);
