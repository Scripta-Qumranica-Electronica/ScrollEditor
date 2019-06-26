import { EditionInfo } from '@/models/edition';
import { ImagedObject } from '@/models/imaged-object';

interface ItemWithId {
    id: any;
}

abstract class StateCollection<T extends ItemWithId> {
    private _items: T[] | undefined;
    private _current: T | undefined;

    constructor() {
        this._items = undefined;
        this._current = undefined;
    }

    public get items(): T[] | undefined {
        return this._items;
    }

    public set items(items: T[] | undefined) {
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
                    this._items = undefined;
                    // reset items, so it will load the list from the server when the list will be needed
                }
            }
            this._current = item;
        } else {
            this._current = undefined;
        }
    }
}

export class EditionCollection extends StateCollection<EditionInfo> { }

export class ImagedObjectCollection extends StateCollection<ImagedObject> { }

export class MiscState {
    public newEditionId: number | undefined;
}
