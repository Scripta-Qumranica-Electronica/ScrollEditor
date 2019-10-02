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
    public static needsRefresh(pt: ProcessTracking | undefined) {
        return (pt === undefined || pt.failed);
        // TODO: Add some sort of expiry mechanism based on the time since pt.endTime
    }

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
        }).catch((err) => {
            console.error('ProcessTracking encountered an error ', err);
            this.failed = true;
        });
    }

    public get done() {
        return !!this.endTime;
    }
}

export default class StateService {
    private static alreadyCreated = false;
    private _state: StateManager;

    private allEditionsProcess: ProcessTracking | undefined;
    private editionProcess: ProcessTracking | undefined;
    private imagedObjectsProcess: ProcessTracking | undefined;
    private artefactsProcess: ProcessTracking | undefined;
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
        if (this.allEditionsProcess) {
            return this.allEditionsProcess.promise;
        }

        const promise = this.allEditionsInternal();
        this.allEditionsProcess = new ProcessTracking(promise, -1);

        return this.allEditionsProcess.promise;
    }

    public async edition(editionId: number): Promise<void> {
        if (this.editionProcess && this.editionProcess.id === editionId) {
            return this.editionProcess.promise;
        }

        const promise = this.editionInternal(editionId);
        this.editionProcess = new ProcessTracking(promise, editionId);

        return this.editionProcess.promise;
    }

    public imagedObjects(editionId: number) {
        if (this.imagedObjectsProcess && this.imagedObjectsProcess.id === editionId) {
            return this.imagedObjectsProcess.promise;
        }

        const promise = this.imagedObjectsInternal(editionId);
        this.imagedObjectsProcess = new ProcessTracking(promise, editionId);
        return this.imagedObjectsProcess.promise;
    }

    public artefacts(editionId: number): Promise<void> {
        if (this.artefactsProcess && this.artefactsProcess.id === editionId) {
            return this.artefactsProcess.promise;
        }

        console.log(`Preparing artefacts for edition ${editionId}`);
        const promise = this.artefactsInternal(editionId);
        this.artefactsProcess = new ProcessTracking(promise, editionId);
        return this.artefactsProcess.promise;
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

    private async allEditionsInternal() {
        const svc = new EditionService();
        const editions = await svc.getAllEditions();
        this._state.editions.items = editions;
    }

    private async editionInternal(editionId: number) {
        // First, make sure we have all editions
        this.allEditions();
        await this.allEditionsProcess!.promise;  // Make sure we have all editions

        const edition = this._state.editions.find(editionId);
        if (!edition) {
            console.warn(`Can't find edition ${editionId} in all editions`);
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
        const manifest = svc.getImageManifest(image);
        image.manifest = manifest;
    }
}
