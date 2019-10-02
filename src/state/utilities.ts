import { EditionInfo } from '@/models/edition';
import { ImagedObject } from '@/models/imaged-object';
import { Artefact } from '@/models/artefact';

interface ItemWithId {
    id: any;
}

abstract class StateCollection<T extends ItemWithId> {
    private _items: T[];
    private _current: T | undefined;

    constructor() {
        this._items = [];
        this._current = undefined;
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

    public find(id: any): T | undefined {
        if (!this._items) {
            return undefined;
        }
        return this._items.find((it) => it.id === id);
    }
}

export class EditionCollection extends StateCollection<EditionInfo> { }

export class ImagedObjectCollection extends StateCollection<ImagedObject> { }

export class ArtefactCollection extends StateCollection<Artefact> { }

export class MiscState {
    public newEditionId: number | undefined;
}
