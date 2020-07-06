import { StateManager } from '@/state';
import EditionService from '@/services/edition';
import ImagedObjectService from '@/services/imaged-object';
import ArtefactService from '@/services/artefact';
import { IIIFImage } from '@/models/image';
import ImageService from '@/services/image';
import TextService from '@/services/text';
import { SignalRWrapper } from './signalr-connection';
import { NotificationHandler } from './notification-handler';
import { ShareInfo, Permissions } from '@/models/edition';
import { AdminEditorRequestDTO } from '@/dtos/sqe-dtos';

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

type ProcessProperties = 'allEditionsProcess' | 'editionProcess' | 'invitationsProcess' | 'imagedObjectsProcess' | 'artefactsProcess' |
    'artefactProcess' | 'textFragmentsProcess' | 'textFragmentProcess' | 'artefactGroupsProcess';

export default class StateService {
    private static alreadyCreated = false;
    private _state: StateManager;
    private _notificationHandler: NotificationHandler;

    private allEditionsProcess: ProcessTracking | undefined;
    private editionProcess: ProcessTracking | undefined;
    private invitationProcess: ProcessTracking | undefined;
    private imagedObjectsProcess: ProcessTracking | undefined;
    private artefactsProcess: ProcessTracking | undefined;
    private artefactProcess: ProcessTracking | undefined;
    private textFragmentsProcess: ProcessTracking | undefined;
    private textFragmentProcess: ProcessTracking | undefined;
    private imageManifestProcesses: Map<string, ProcessTracking>; // Map from url to ProcessTracking
    private artefactGroupsProcess: ProcessTracking | undefined;
    // TODO: Add process for artefactGroups

    public constructor(state: StateManager) {
        if (StateService.alreadyCreated) {
            console.error("Can't initialize StateService more than once");
            throw new Error("Can't initialize StateService more than once");
        }
        this._state = state;
        this.imageManifestProcesses = new Map<string, ProcessTracking>();
        this._notificationHandler = new NotificationHandler();
        SignalRWrapper.instance.registerNotificationHandler(this._notificationHandler);
        StateService.alreadyCreated = true;
    }

    public async allEditions(): Promise<void> {
        return this.wrapInternal('allEditionsProcess', -1, (id: number) => this.allEditionsInternal());
    }

    public async edition(editionId: number): Promise<void> {
        return this.wrapInternal('editionProcess', editionId, (id: number) => this.editionInternal(id));
    }

    public async invitations(editionId: number): Promise<void> {
        return this.wrapInternal('invitationsProcess', editionId, (id: number) => this.invitationsInternal(id));
    }

    public async textFragments(editionId: number): Promise<void> {
        return this.wrapInternal('textFragmentsProcess', editionId, (id: number) => this.textFragmentsInternal(id));
    }

    public async artefactGroups(editionId: number): Promise<void> {
        return this.wrapInternal('artefactGroupsProcess', editionId, (id: number) => this.artefactGroupsInternal(id));
    }

    public imagedObjects(editionId: number) {
        return this.wrapInternal('imagedObjectsProcess', editionId, (id: number) => this.imagedObjectsInternal(id));
    }

    public async artefacts(editionId: number): Promise<void> {
        return this.wrapInternal('artefactsProcess', editionId, (id: number) => this.artefactsInternal(id));
    }

    public artefact(editionId: number, artefactId: number): Promise<void> {
        return this.wrapInternal('artefactProcess', artefactId, (id) => this.artefactInternal(editionId, id));
    }

    public textFragment(editionId: number, textFragmentId: number): Promise<void> {
        return this.wrapInternal(
            'textFragmentProcess', textFragmentId, (id) => this.textFragmentInternal(editionId, id));
    }

    public async imageManifest(image: IIIFImage): Promise<void> {
        let pt = this.imageManifestProcesses.get(image.manifestUrl);
        if (pt && image.manifest) {
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

        // Clear data from the previous edition
        // TODO: process the artefactGroups, too (clear, prepare, wait in Promise.all)
        this._state.textFragments.clear();
        this._state.interpretationRois.clear();
        this._state.signInterpretations.clear();
        this._state.artefactGroups.clear();

        // Load the new data
        this.imagedObjects(editionId);
        this.artefacts(editionId);
        this.textFragments(editionId);
        this.artefactGroups(editionId);
        await Promise.all([
            this.imagedObjectsProcess!.promise,
            this.artefactsProcess!.promise,
            this.textFragmentsProcess!.promise,
            this.artefactGroupsProcess!.promise,
        ]);
        SignalRWrapper.instance.subscribeEdition(editionId);
    }

    private async textFragmentsInternal(editionId: number) {
        if (this._state.editions.current?.id !== editionId) {
            throw new Error(`Can't fetch text fragments for non-current edition ${editionId}`);
        }
        this._state.editions.current!.textFragments = [];
        const svc = new TextService();
        const fragments = await svc.getEditionTextFragments(editionId);
        this._state.editions.current!.textFragments = fragments;
    }

    private async artefactGroupsInternal(editionId: number) {
        if (this._state.editions.current?.id !== editionId) {
            throw new Error(`Can't fetch artefact Groups for non-current edition ${editionId}`);
        }
        this._state.editions.current!.artefactGroups = [];

        const svc = new EditionService();
        const artefactGroups = await svc.getArtefactGroups(editionId);
        this._state.editions.current!.artefactGroups = artefactGroups;
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

        // Load the image's manifest
        const imPromise = this.imageManifest(stack.master);

        // Load the artefact's text fragments
        const textService = new TextService();
        const tfPromise = textService.getArtefactTextFragments(editionId, artefactId);

        await Promise.all([imPromise, tfPromise]); // Let both requests happen concurrently
        artefact.textFragments = await tfPromise;

        this._state.artefacts.current = artefact;
        this._state.imagedObjects.current = imagedObject;
    }

    private async textFragmentInternal(editionId: number, textFragmentId: number) {
        await this.edition(editionId);

        // See if the text fragment has already been loaded into the store
        const textFragment = this._state.textFragments.get(textFragmentId);
        if (textFragment) {
            return;
        }

        // Make sure the fragment really exists with the edition
        const textFragmentData = this._state.editions.current!.textFragments!.find((tf) => tf.id === textFragmentId);
        if (!textFragmentData) {
            console.error(`Can't located text fragment ID ${textFragmentId} in edition ${editionId}`);
            throw new Error(`Can't located text fragment ID ${textFragmentId} in edition ${editionId}`);
        }

        // Load the text fragment from the server
        const svc = new TextService();
        const textEdition = await svc.getTextFragment(editionId, textFragmentId);

        // For now, this is what the backend returns
        if (textEdition.textFragments.length !== 1 || textEdition.textFragments[0].id !== textFragmentId) {
            console.error(`Backend did not return the one expected text fragment ${textFragmentId}`);
            throw new Error(`Backend did not return the one expected text fragment ${textFragmentId}`);
        }

        const current = textEdition.textFragments[0];
        this._state.textFragments.put(current);

        // Add all the sign interpretations and ROIs

        for (const line of current.lines) {
            for (const sign of line.signs) {
                for (const si of sign.signInterpretations) {
                    this._state.signInterpretations.put(si);
                    for (const roi of si.rois) {
                        this._state.interpretationRois.put(roi);
                    }
                }
            }
        }
    }

    private async invitationsInternal(editionId: number) {
        await this.edition(editionId);

        const svc = new EditionService();
        const allInvitations = await svc.getAllInvitations();

        const edition = this._state.editions.find(editionId);

        if (!edition) {
            return;
        }

        const editionInvitations = allInvitations.editorRequests.filter(
            (i: AdminEditorRequestDTO) => i.editionId === edition.id
        );
        edition.invitations = editionInvitations.map(
            x => new ShareInfo(x.editorEmail, new Permissions(x))
        );
    }
}
