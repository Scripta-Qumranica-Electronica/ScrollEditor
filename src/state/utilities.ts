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
        if (!this._items) {
            throw new Error("Can't set the current item of an undefined collection");
        }

        if (item) {
            const existing = this._items.find((a) => a.id === item.id);
            if (!existing) {
                console.error(`Can't set current of ${this} to item ${item} since it is not in the collection`);
                throw new Error("Can't set current to an item that isn't in the collection");
            }
            this._current = existing;
        } else {
            this._current = undefined;
        }
    }
}

export class EditionCollection extends StateCollection<EditionInfo> { }

export class ImagedObjectCollection extends StateCollection<ImagedObject> { }
