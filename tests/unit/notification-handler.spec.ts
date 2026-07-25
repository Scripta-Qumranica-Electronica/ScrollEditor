import { describe, it, expect, beforeEach } from 'vitest';
import { StateManager } from '@/state';
import { Artefact } from '@/models/artefact';
import {
    NotificationHandler,
    applyArtefactDto,
    registerPendingOperation,
} from '@/state/notification-handler';
import { HANDLED_EVENTS, UNHANDLED_EVENTS } from '@/state/notification-coverage';
import type { ArtefactDTO } from '@/dtos/sqe-dtos';

function makeArtefactDto(over: Partial<ArtefactDTO> = {}): ArtefactDTO {
    return {
        id: 1,
        name: 'frg 1',
        editionId: 100,
        imagedObjectId: 'IO-1',
        imageId: 1,
        artefactDataEditorId: 1,
        mask: 'POLYGON((0 0,10 0,10 10,0 10,0 0))',
        artefactMaskEditorId: 1,
        isPlaced: true,
        placement: { scale: 1, rotate: 0, translate: { x: 100, y: 200 }, zIndex: 0, mirrored: false },
        artefactPlacementEditorId: 1,
        side: 'recto',
        statusMessage: '',
        ...over,
    } as ArtefactDTO;
}

const st = StateManager.instance;

describe('notification reducer — realtime state sync', () => {
    beforeEach(() => {
        st.artefacts.items = [];
    });

    it('adds a new artefact via the single reducer', () => {
        applyArtefactDto(makeArtefactDto({ id: 5 }));
        expect(st.artefacts.find(5)).toBeTruthy();
        expect(st.artefacts.items.length).toBe(1);
    });

    it('P0: updated-artefact writes placement + mask onto the SAME instance', () => {
        st.artefacts.add(new Artefact(makeArtefactDto({ id: 7 })));
        // Capture the instance AS HELD BY THE STORE (a reactive proxy), so the
        // identity check below verifies copyFrom mutated it in place rather than
        // comparing against the pre-insert raw object.
        const a = st.artefacts.find(7)!;
        new NotificationHandler().handleUpdatedArtefact(
            makeArtefactDto({
                id: 7,
                mask: 'POLYGON((0 0,20 0,20 20,0 20,0 0))',
                placement: { scale: 1, rotate: 0, translate: { x: 999, y: 200 }, zIndex: 0, mirrored: false },
            }),
        );
        const updated = st.artefacts.find(7)!;
        expect(updated).toBe(a); // identity preserved (copyFrom, not replaced)
        expect(updated.placement.translate.x).toBe(999);
        expect(updated.mask.wkt).toContain('20 20');
    });

    it('P3 diff-before-write: an identical update does not replace the collection array', () => {
        st.artefacts.add(new Artefact(makeArtefactDto({ id: 8 })));
        const before = st.artefacts.items;
        applyArtefactDto(makeArtefactDto({ id: 8 }), true); // render-identical
        expect(st.artefacts.items).toBe(before); // no churn -> diff skipped the write
    });

    it('P3 diff-before-write: a genuine change DOES replace the array', () => {
        st.artefacts.add(new Artefact(makeArtefactDto({ id: 8 })));
        const before = st.artefacts.items;
        applyArtefactDto(
            makeArtefactDto({ id: 8, placement: { scale: 1, rotate: 0, translate: { x: 7, y: 7 }, zIndex: 0, mirrored: false } }),
            true,
        );
        expect(st.artefacts.items).not.toBe(before);
        expect(st.artefacts.find(8)!.placement.translate.x).toBe(7);
    });

    it('T2 opId: a broadcast carrying our pending opId is applied as our own change', () => {
        st.artefacts.add(new Artefact(makeArtefactDto({ id: 9 })));
        registerPendingOperation('op-abc');
        applyArtefactDto(
            makeArtefactDto({
                id: 9,
                operationId: 'op-abc',
                placement: { scale: 1, rotate: 0, translate: { x: 42, y: 200 }, zIndex: 0, mirrored: false },
            }),
        );
        expect(st.artefacts.find(9)!.placement.translate.x).toBe(42);
    });

    it('ignores an update for an artefact we do not hold', () => {
        new NotificationHandler().handleUpdatedArtefact(makeArtefactDto({ id: 404 }));
        expect(st.artefacts.find(404)).toBeNull();
    });

    it('handleCreatedImagedObject adds it (idempotent); handleDeletedImagedObject removes it', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        st.editions.current = {} as any; // handler only needs a truthy current edition
        const h = new NotificationHandler();
        // A sideless DTO: with no recto/verso the ImagedObject ctor skips ImageStack construction.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const io = { id: 'IO-RT', artefacts: [] } as any;

        h.handleCreatedImagedObject(io);
        expect(st.imagedObjects.find('IO-RT')).toBeTruthy();

        h.handleCreatedImagedObject(io); // own echo / re-broadcast -> no duplicate
        expect(st.imagedObjects.items.filter((x) => x.id === 'IO-RT').length).toBe(1);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        h.handleDeletedImagedObject({ ids: ['IO-RT'] } as any);
        expect(st.imagedObjects.find('IO-RT')).toBeNull();
    });
});

describe('notification coverage contract', () => {
    it('every ISQEClient event has exactly one decision (handled xor unhandled), 40 total', () => {
        const handled = HANDLED_EVENTS.map(([e]) => e);
        const unhandled = [...UNHANDLED_EVENTS];
        const overlap = handled.filter((e) => unhandled.includes(e));
        expect(overlap).toEqual([]);
        expect(new Set([...handled, ...unhandled]).size).toBe(handled.length + unhandled.length);
        expect(handled.length + unhandled.length).toBe(40);
    });
});
