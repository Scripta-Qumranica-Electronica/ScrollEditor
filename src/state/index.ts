import { SessionState } from './session';
import { EditionCollection,
    ImagedObjectCollection,
    MiscState,
    ArtefactCollection,
    InterpretationRoiMap,
    SignInterpretationMap,
    TextFragmentMap,
    ArtefactGroupsMap } from './utilities';
import { Polygon } from '@/utils/Polygons';
import StateService from './state-service';
import Vue from 'vue';
import { ScrollEditorState } from './scroll-editor';

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
    public eventBus: Vue; // TODO: Switch to our eventBus class

    public prepare: StateService;

    private constructor() {
        this.session = new SessionState();
        this.editions = new EditionCollection();
        this.imagedObjects = new ImagedObjectCollection();
        this.artefacts = new ArtefactCollection();
        this.artefactGroups = new ArtefactGroupsMap();
        this.textFragments = new TextFragmentMap();
        this.misc = new MiscState();
        this.scrollEditor = new ScrollEditorState();
        this.interpretationRois = new InterpretationRoiMap();
        this.signInterpretations = new SignInterpretationMap();
        this.eventBus = new Vue();
        this.prepare = new StateService(this);
    }

    public static get instance() {
        if (!StateManager._instance) {
            StateManager._instance = new StateManager();
        }
        return StateManager._instance;
    }
}
