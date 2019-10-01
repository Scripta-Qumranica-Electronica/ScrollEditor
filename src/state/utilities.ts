import { EditionInfo } from '@/models/edition';
import { ImagedObject } from '@/models/imaged-object';
import { Artefact } from '@/models/artefact';

interface ItemWithId {
    id: any;
}

abstract class StateCollection<T extends ItemWithId> {
    private _items: T[];
    private _current: T | undefined;
    private _promises: Map<number, Promise<T>>;

    constructor() {
        this._items = [];
        this._current = undefined;
        this._promises = new Map<number, Promise<T>>();
    }

    public get items(): T[] {
        return this._items;
    }

    public set items(items: T[]) {
        this._items = items;
        this._current = undefined;
    }

    public get current(): T | undefined {
        return this._current;
    }

    public set current(item: T | undefined) {
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
            this._current = undefined;
        }
    }

    public find(id: number): T | undefined {
        if (!this._items) {
            return undefined;
        }
        return this._items.find((it) => it.id === id);
    }

    public findPromise(id: number): Promise<T> | undefined {
        return this._promises.get(id);
    }

    public setPromise(id: number, promise: Promise<T>) {
        this._promises.set(id, promise);
    }
}

export class EditionCollection extends StateCollection<EditionInfo> { }

export class ImagedObjectCollection extends StateCollection<ImagedObject> { }

export class ArtefactCollection extends StateCollection<Artefact> { }

export class MiscState {
    public newEditionId: number | undefined;
}
