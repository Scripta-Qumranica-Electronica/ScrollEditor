import { EditionInfo } from '@/models/edition';
import { ImagedObject } from '@/models/imaged-object';
import { Artefact } from '@/models/artefact';
import { Image } from '@/models/image';
import { TextFragment } from '@/models/text';

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

// A cache of items, with a limit on the number of cached items.
// Inspired by https://medium.com/sparkles-blog/a-simple-lru-cache-in-typescript-cba0d9807c40
abstract class StateCache<T extends ItemWithId> {
    private _entries: Map<any, T> = new Map<any, T>();
    private _maxEntries: number = 200;

    constructor(maxEntries = 200) {
        this._maxEntries = maxEntries;
        this._entries = new Map<any, T>();
    }

    public get(key: any): T | undefined {
        const entry = this._entries.get(key);
        if (entry) {
            // Add entry again, pushing it to the back of the key list (last to be removed)
            this._entries.delete(key);
            this._entries.set(key, entry!);
        }

        return entry;
    }

    public put(key: string, value: T) {

        if (this._entries.size >= this._maxEntries) {
            // least-recently used cache eviction strategy
            // Map keeps keys in the order they were added
            const keyToDelete = this._entries.keys().next().value;
            this._entries.delete(keyToDelete);
        }
        this._entries.set(key, value);
    }
}

export class EditionCollection extends StateCollection<EditionInfo> { }

export class ImagedObjectCollection extends StateCollection<ImagedObject> { }

export class ArtefactCollection extends StateCollection<Artefact> { }

export class TextFragmentCollection extends StateCollection<TextFragment> { }

export class ImageCache extends StateCache<Image> { }

export class MiscState {
    public newEditionId: number | undefined;
}
