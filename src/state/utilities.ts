import { EditionInfo, ArtefactGroup } from '@/models/edition';
import { ImagedObject } from '@/models/imaged-object';
import { Artefact } from '@/models/artefact';
import { Image } from '@/models/image';
import { TextFragment, InterpretationRoi, SignInterpretation } from '@/models/text';
import { StateManager } from '.';

export interface ItemWithId<U> {
    id: U;
}

abstract class StateCollection<T extends ItemWithId<U>, U = number> {
    private _items: T[];
    private _current: T | null;

    constructor() {
        this._items = [];
        this._current = null;
    }

    public get items(): T[] {
        return this._items;
    }

    public set items(items: T[]) {
        this._items = items;
        this._current = null;
    }

    public get current(): T | null {
        return this._current;
    }

    public set current(item: T | null) {
        if (item) {
            if (this._items) {
                const existing = this._items.find((a) => a.id === item.id);
                if (!existing) {
                    this._items = [];
                    // reset items, so it will load the list from the server when the list will be needed
                }
            }
            this._current = item;
        } else {
            this._current = null;
        }
    }

    // public find(id: U): T | undefined {
    //     if (!this._items) {
    //         return undefined;
    //     }
    //     return this._items.find((it) => it.id === id);
    // }

    public find(id: U): T | null { // } | undefined {
        if (!this._items) {
            return null;
        }
        const res = this._items.find((it) => it.id === id);
        return (undefined === res ) ?  null : res ;
    }

    public update(entity: T, failIfNotFound = true) {
        const idx = this._items.findIndex((it) => it.id === entity.id);
        if (idx === -1) {
            if (failIfNotFound) {
                throw new Error(`Can't update entity ${entity.id}, it is not in the collection`);
            }
        }
        const newItems = [...this._items]; // Create a new copy, for reactiveness
        newItems[idx] = entity;
        this.replaceItems(newItems);
    }

    public remove(entityId: U, failIfNotFound = true) {
        const idx = this._items.findIndex((it) => it.id === entityId);
        if (idx === -1) {
            if (failIfNotFound) {
                throw new Error(`Can't delete entity ${entityId}, it is not in the collection`);
            }
        }

        if (this._current && this._current.id === entityId) {
            this._current = null;
        }

        const newItems = [...this._items]; // Create a new copy, for reactiveness
        newItems.splice(idx, 1);
        this.replaceItems(newItems);
    }

    public add(entity: T, failIfExisting = true) {
        if (this.find(entity.id)) {
            if (failIfExisting) {
                throw new Error(`Can't add entity ${entity.id} ,it is already in the collection`);
            }
            return;
        }

        const newItems = [...this._items, entity];
        this.replaceItems(newItems);
    }

    protected replaceItems(newItems: T[]) {
        const oldCurrent = this._current;
        this.items = newItems;
        const newCurrent = oldCurrent && this.find(oldCurrent.id);
        this.current = (undefined === newCurrent) ? null : newCurrent;
        // this.current = newCurrent;
    }
}

// A cache of items, with a limit on the number of cached items.
// Inspired by https://medium.com/sparkles-blog/a-simple-lru-cache-in-typescript-cba0d9807c40
abstract class StateCache<T extends ItemWithId<U>, U = number> {
    private _entries: Map<U, T> = new Map<U, T>();
    private _maxEntries: number = 200;

    constructor(maxEntries = 200) {
        this._maxEntries = maxEntries;
    }

    public get(key: U): T | undefined {
        const entry = this._entries.get(key);
        if (entry) {
            // Add entry again, pushing it to the back of the key list (last to be removed)
            this._entries.delete(key);
            this._entries.set(key, entry!);
        }

        return entry;
    }

    public put(key: U, value: T) {

        if (this._entries.size >= this._maxEntries) {
            // least-recently used cache eviction strategy
            // Map keeps keys in the order they were added
            const keyToDelete = this._entries.keys().next().value;
            this._entries.delete(keyToDelete);
        }
        this._entries.set(key, value);
    }
}

// A map of items, used for holding
abstract class StateMap<T extends ItemWithId<U>, U = number> {
    private _entries = new Map<U, T>();
    private _frontendToServerIdMap = new Map<U, U>();
    private _serverToFrontendIdMap = new Map<U, U>();

    public get(key: U, considerServerIds = false): T | undefined {
        let actualKey: U | undefined = key;

        if (!this._entries.has(key) && considerServerIds) {
            if (this._frontendToServerIdMap.has(key)) {
                actualKey = this._frontendToServerIdMap.get(key);
            } else if (this._serverToFrontendIdMap.has(key)) {
                actualKey = this._serverToFrontendIdMap.get(key);
            }

            if (!actualKey) {
                return undefined;
            }
        }

        const entry = this._entries.get(actualKey);
        return entry;
    }

    public put(entry: T) {
        return this._entries.set(entry.id, entry);
    }

    public get size() {
        return this._entries.size;
    }

    public get keys() {
        return this._entries.keys();
    }

    public *getItems() {
        for (const key of this._entries.keys()) {
            yield this._entries.get(key)!;
        }
    }

    public setItems(items: Iterable<T>) {
        this._entries.clear();
        for (const item of items) {
            this.put(item);
        }
    }

    public clear() {
        this._entries.clear();
        this._frontendToServerIdMap.clear();
    }

    public delete(id: U) {
        this._entries.delete(id);
    }

    // Sometimes we generate entity IDs in the frontend - when creating new entities. When the entities are saved
    // the server returns their new - final ID. We update the state, but the undo stack still contains the old frontend-only
    // IDs.
    //
    // We map these frontend IDs to server IDs here.
    // Note that we do not do anything with these IDs, all logic should be implemented by the different view and operation
    // classes.
    public mapFrontendIdToServerId(frontendId: U, serverId: U) {
        this._frontendToServerIdMap.set(frontendId, serverId);
        this._serverToFrontendIdMap.set(serverId, frontendId);

        console.debug(`Mapping frontend id ${frontendId} to server id ${serverId}`);
    }

    public getServerId(frontendId: U): U | undefined {
        return this._frontendToServerIdMap.get(frontendId);
    }
}



export class EditionCollection extends StateCollection<EditionInfo> { }

export class ImagedObjectCollection extends StateCollection<ImagedObject, string> { }

export class ArtefactCollection extends StateCollection<Artefact> { }

export class ArtefactGroupsMap extends StateMap<ArtefactGroup> { }

export class TextFragmentMap extends StateMap<TextFragment> { }

export class ImageCache extends StateCache<Image> { }

function state() {
    return StateManager.instance;
}
export class InterpretationRoiMap extends StateMap<InterpretationRoi> {
    public put(entry: InterpretationRoi) {
        this.attachRoiToArtefact(entry);
        return super.put(entry);
    }

    public delete(id: number) {
        const entry = this.get(id);
        if (!entry) {
            console.warn(`Can't remove ROI ${id} - it is not in the ROI state map`);
            return;
        }
        this.detachRoiFromArtefact(entry);
        return super.delete(id);
    }

    public clear() {
        for (const artefact of state().artefacts.items) {
            artefact.rois = [];
        }
        super.clear();
    }

    // InterperationROIs are marked as deleted and not actually deleted (so undeleting is easy)
    // We do not want to track deleted ROIs in artefacts
    public attachRoiToArtefact(entry: InterpretationRoi) {
        const artefact = state().artefacts.find(entry.artefactId);
        if (!artefact) {
            console.warn(`Adding ROI for artefact ${entry.artefactId}, while artefact is not in state`);
        } else {
            const roiIndex = artefact.rois.findIndex(roi => roi.id === entry.id);
            if (roiIndex === -1) {
                console.debug(`Adding ROI ${entry.id} to artefact ${artefact.id}`);
                artefact.rois.push(entry);
            } else {
                console.debug(`ROI ${entry.id} is already found in artefact ${artefact.id}`);
            }
        }
    }

    public detachRoiFromArtefact(entry: InterpretationRoi) {
        const artefact = state().artefacts.find(entry.artefactId);
        if (!artefact) {
            console.warn(`Adding ROI for artefact ${entry.artefactId}, while artefact is not in state`);
        } else {
            const roiIndex = artefact.rois.findIndex(roi => roi.id === entry.id);
            if (roiIndex === -1) {
                console.warn(`Can't removing ROI ${entry.id} from artefact ${entry.artefactId}, it is not in its ROI list`);
            } else {
                console.debug(`Removing ROI ${entry.id} from artefact ${artefact.id}`);
                artefact.rois.splice(roiIndex, 1);
            }
        }
    }
}

export class SignInterpretationMap extends StateMap<SignInterpretation> {
    public put(entry: SignInterpretation) {
        for (const roi of entry.rois) {
            const artefact = state().artefacts.find(roi.artefactId);
            if (!artefact) {
                console.warn(`Can't find artefact ${roi.artefactId} for ROI ${roi.id}`);
                continue;
            }

            const index = artefact.signInterpretations.findIndex(si => si.id === entry.id);
            if (index === -1) {
                artefact.signInterpretations.push(entry);
            }
        }

        return super.put(entry);
    }

    public delete(id: number) {
        const si = state().signInterpretations.get(id);
        if (!si) {
            console.warn(`Can't delete sign interpretaetion ${id}, it is not in the state`);
            return;
        }

        for (const roi of si.rois) {
            const artefact = state().artefacts.find(roi.artefactId);
            if (!artefact) {
                console.warn(`Can't find artefact ${roi.artefactId} for ROI ${roi.id}`);
                continue;
            }

            const index = artefact.signInterpretations.findIndex(s => s.id === id);
            if (index === -1) {
                console.warn(`Can't remove sign interpretation ${id} from artefact ${artefact.id} - it is not in its signInterpretations array`);
            } else {
                artefact.signInterpretations.splice(index, 1);
            }
        }
    }

    public clear() {
        for (const artefact of state().artefacts.items) {
            artefact.signInterpretations = [];
        }
        super.clear();
    }
}

export class MiscState {
    public newEditionId!: number ;
}
