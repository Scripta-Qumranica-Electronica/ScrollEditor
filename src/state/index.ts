import { SessionState } from './session';
import { EditionCollection, ImagedObjectCollection, MiscState, ArtefactCollection } from './utilities';
import { Polygon } from '@/utils/Polygons';

export class StateManager {
    private static _instance: StateManager;

    public session: SessionState;
    public editions: EditionCollection;
    public imagedObjects: ImagedObjectCollection;   // Imaged objects for the current edition
    public artefacts: ArtefactCollection;           // Artefacts for the current edition or imaged object
    public misc: MiscState;
    public signMap: Map<string, Polygon>;

    private constructor() {
        this.session = new SessionState();
        this.editions = new EditionCollection();
        this.imagedObjects = new ImagedObjectCollection();
        this.artefacts = new ArtefactCollection();
        this.misc = new MiscState();
        this.signMap = new Map<string, Polygon>();
    }

    public static get instance() {
        if (!StateManager._instance) {
            StateManager._instance = new StateManager();
        }
        return StateManager._instance;
    }
}
