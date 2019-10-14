import { StateManager } from '@/state';
import EditionService from '@/services/edition';
import ImagedObjectService from '@/services/imaged-object';
import ArtefactService from '@/services/artefact';
import { IIIFImage } from '@/models/image';
import ImageService from '@/services/image';

/*
 * This service handles all the state data.
 *
 * It is responsible for preparing the state data, updating it (through SignalR notifications),
 * and taking care of multiple concurrent requests for the same piece of data.
 *
 * Althought this class is not written as a singleton, it really is. StateManager.instance.prepare holds
 * the single reference to this class. Trying to instantiate this class twice will result in an exception
 */

class ProcessTracking {
    public promise: Promise<void>;
    public id: number;
    public startTime: number;
    public endTime: number | undefined;
    public failed: boolean;

    public constructor(promise: Promise<void>, id: number) {
        this.promise = promise;
        this.startTime = Date.now();
        this.endTime = undefined;
        this.id = id;
        this.failed = false;

        promise.then(() => {
            this.endTime = Date.now();
            this.failed = false;
        }).catch((err) => {
            console.error('ProcessTracking encountered an error ', err);
            this.failed = true;
        });
    }

    public needsRefresh(): boolean {
        return this.failed;
    }
}

type ProcessProperties = 'allEditionsProcess' | 'editionProcess' | 'imagedObjectsProcess' | 'artefactsProcess' |
                         'artefactProcess';

export default class StateService {
    private static alreadyCreated = false;
    private _state: StateManager;

    private allEditionsProcess: ProcessTracking | undefined;
    private editionProcess: ProcessTracking | undefined;
    private imagedObjectsProcess: ProcessTracking | undefined;
    private artefactsProcess: ProcessTracking | undefined;
    private artefactProcess: ProcessTracking | undefined;
    private imageManifestProcesses: Map<string, ProcessTracking>; // Map from url to ProcessTracking

    public constructor(state: StateManager) {
        if (StateService.alreadyCreated) {
            console.error("Can't initialize StateService more than once");
            throw new Error("Can't initialize StateService more than once");
        }
        this._state = state;
        this.imageManifestProcesses = new Map<string, ProcessTracking>();
        StateService.alreadyCreated = true;
    }

    public allEditions(): Promise<void> {
        return this.wrapInternal('allEditionsProcess', -1, (id: number) => this.allEditionsInternal());
    }

    public async edition(editionId: number): Promise<void> {
        return this.wrapInternal('editionProcess', editionId, (id: number) => this.editionInternal(id));
    }

    public imagedObjects(editionId: number) {
        return this.wrapInternal('imagedObjectsProcess', editionId, (id: number) => this.imagedObjectsInternal(id));
    }

    public artefacts(editionId: number): Promise<void> {
        return this.wrapInternal('artefactsProcess', editionId, (id: number) => this.artefactsInternal(id));
    }

    public artefact(editionId: number, artefactId: number): Promise<void> {
        return this.wrapInternal('artefactProcess', artefactId, (id) => this.artefactInternal(editionId, id));
    }

    public imageManifest(image: IIIFImage): Promise<void> {
        let pt = this.imageManifestProcesses.get(image.manifestUrl);
        if (pt) {
            return pt.promise;
        }

        const promise = this.imageManifestInternal(image);
        pt = new ProcessTracking(promise, -1);
        this.imageManifestProcesses.set(image.manifestUrl, pt);
        return pt.promise;
    }

    private getProcess(processName: ProcessProperties): ProcessTracking | undefined {
        const self = this as any;
        const pt = self[processName];

        if (pt === undefined) {
            return undefined;
        }

        if (!(pt instanceof ProcessTracking)) {
            console.error(`${processName} does not resolve to a ProcessTracking instance`);
            throw Error(`${processName} does not resolve to a ProcessTracking instance`);
        }

        return pt;
    }

    private setProcess(processName: ProcessProperties, processTracking: ProcessTracking | undefined) {
        const existing = this.getProcess(processName);  // throws an exception if processName is incorrect
        const self = this as any;
        self[processName] = processTracking;
    }

    private wrapInternal(processName: ProcessProperties, id: number, internal: (id: number) => Promise<void>) {
        // Waiting for a better solution:
        // https://stackoverflow.com/questions/58209234/typescript-pass-property-by-name
        let pt = this.getProcess(processName);
        if (pt && pt.id === id && !pt.needsRefresh()) {
            return pt.promise;
        }

        const promise = internal(id);
        pt = new ProcessTracking(promise, id);
        this.setProcess(processName, pt);

        return pt.promise;
    }

    private async allEditionsInternal() {
        const svc = new EditionService();
        const editions = await svc.getAllEditions();
        this._state.editions.items = editions;
    }

    private async editionInternal(editionId: number) {
        // First, make sure we have all editions
        await this.allEditions();

        const edition = this._state.editions.find(editionId);
        if (!edition) {
            console.error(`Can't find edition ${editionId} in all editions`);
            throw new Error(`Can't find edition ${editionId} in all editions`);
        }

        this._state.editions.current = edition;
        this.imagedObjects(editionId);
        this.artefacts(editionId);
        await Promise.all([this.imagedObjectsProcess!.promise, this.artefactsProcess!.promise]);
    }

    private async imagedObjectsInternal(editionId: number) {
        this._state.imagedObjects.items = [];
        const svc = new ImagedObjectService();
        const imagedObjects = await svc.getEditionImagedObjects(editionId);
        this._state.imagedObjects.items = imagedObjects;
    }

    private async artefactsInternal(editionId: number) {
        this._state.artefacts.items = [];
        const svc = new ArtefactService();
        const artefacts = await svc.getEditionArtefacts(editionId);
        this._state.artefacts.items = artefacts;
    }

    private async imageManifestInternal(image: IIIFImage) {
        const svc = new ImageService();
        const manifest = await svc.getImageManifest(image);
        image.manifest = manifest;
    }

    private async artefactInternal(editionId: number, artefactId: number) {
        await this.edition(editionId);
        const artefact = this._state.artefacts.find(artefactId);
        if (!artefact) {
            console.error(`Can't located artefact ${artefactId} in edition ${editionId}`);
            throw new Error(`Can't located artefact ${artefactId} in edition ${editionId}`);
        }

        const imagedObject = this._state.imagedObjects.find(artefact.imagedObjectId);
        if (!imagedObject) {
            console.error(`Can't locate imaged object ${artefact.imagedObjectId} for artefact ${artefact.id}`);
            throw new Error(`Can't locate imaged object ${artefact.imagedObjectId} for artefact ${artefact.id}`);
        }

        const stack = artefact.side === 'recto' ? imagedObject.recto : imagedObject.verso;
        if (!stack) {
            console.error(`Can't locate ${artefact.side} in imaged object ${artefact.imagedObjectId}`);
            throw new Error(`Can't locate ${artefact.side} in imaged object ${artefact.imagedObjectId}`);
        }
        await this.imageManifest(stack.master);

        this._state.artefacts.current = artefact;
        this._state.imagedObjects.current = imagedObject;
    }
}