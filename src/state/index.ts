import { SessionState } from './session';
import { EditionCollection, ImagedObjectCollection } from './utilities';

export class StateManager {
    private static _instance: StateManager;

    public session: SessionState;
    public editions: EditionCollection;
    public imagedObjects: ImagedObjectCollection;

    private constructor() {
        this.session = new SessionState();
        this.editions = new EditionCollection();
        this.imagedObjects = new ImagedObjectCollection();
    }

    public static get instance() {
        if (!StateManager._instance) {
            StateManager._instance = new StateManager();
        }
        return StateManager._instance;
    }
}
