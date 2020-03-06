/*
 * This module contains utility functions for working with collections. Collections are assumed to be ID based
 */

import { ItemWithId } from '@/state/utilities';
import Vue from 'vue';

function findInArray<T extends ItemWithId<U>, U>(entityId: U, array: T[]): number {
    return array.findIndex(e => e.id === entityId);
}

export function addToArray<T extends ItemWithId<U>, U>(entity: T, array?: T[]) {
    if (!array) {
        return;
    }
    const idx = findInArray(entity.id, array);
    if (idx === -1) {
        array.push(entity);
    } else {
        array[idx] = entity;
    }
}

export function updateInArray<T extends ItemWithId<U>, U>(entity: T, array?: T[]) {
    if (!array) {
        return;
    }
    const idx = findInArray(entity.id, array);
    if (idx === -1) {
        return array;
    }
    Vue.set(array, idx, entity);
}

export function removeFromArray<T extends ItemWithId<U>, U>(entityId: U, array?: T[]) {
    if (!array) {
        return;
    }
    const idx = findInArray(entityId, array);
    if (idx >= 0) {
        array.splice(idx, 1);
    }
}
