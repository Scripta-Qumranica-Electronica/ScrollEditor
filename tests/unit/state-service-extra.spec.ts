import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks. StateService constructs its collaborators with `new XyzService()` and
// talks to the SignalR singleton; we replace all of them with inert doubles so
// the lazy-load pipeline is exercised without any network or real connection.
// ---------------------------------------------------------------------------

const mocks = vi.hoisted(() => {
    const editionSvc = {
        getAllEditions: vi.fn(),
        getScribalFont: vi.fn(),
        getEditionMetadata: vi.fn(),
        getArtefactGroups: vi.fn(),
        getAllAttributeMetadata: vi.fn(),
        getAllInvitations: vi.fn(),
    };
    const artefactSvc = {
        getEditionArtefacts: vi.fn(),
        getEditionArtefactMasks: vi.fn(),
        getArtefactMask: vi.fn(),
    };
    const imagedObjectSvc = {
        getEditionImagedObjects: vi.fn(),
    };
    const textSvc = {
        getEditionTextFragments: vi.fn(),
        getArtefactTextFragments: vi.fn(),
        getTextFragment: vi.fn(),
        getEditionFullText: vi.fn(),
    };
    const imageSvc = {
        getImageManifest: vi.fn(),
    };
    const signalr = {
        registerNotificationHandler: vi.fn(),
        subscribeEdition: vi.fn().mockResolvedValue(undefined),
    };
    const routerPush = vi.fn();
    return { editionSvc, artefactSvc, imagedObjectSvc, textSvc, imageSvc, signalr, routerPush };
});

const { editionSvc, artefactSvc, imagedObjectSvc, textSvc, imageSvc, signalr, routerPush } = mocks;

vi.mock('@/services/edition', () => ({ default: class { constructor() { return mocks.editionSvc; } } }));
vi.mock('@/services/artefact', () => ({ default: class { constructor() { return mocks.artefactSvc; } } }));
vi.mock('@/services/imaged-object', () => ({ default: class { constructor() { return mocks.imagedObjectSvc; } } }));
vi.mock('@/services/text', () => ({ default: class { constructor() { return mocks.textSvc; } } }));
vi.mock('@/services/image', () => ({ default: class { constructor() { return mocks.imageSvc; } } }));
vi.mock('@/state/signalr-connection', () => ({
    SignalRWrapper: { instance: mocks.signalr },
}));
vi.mock('@/router', () => ({ default: { push: mocks.routerPush } }));

import { StateManager } from '@/state';
import { Artefact } from '@/models/artefact';
import { EditionInfo } from '@/models/edition';
import { ImagedObject } from '@/models/imaged-object';
import type {
    ArtefactDTO,
    EditionDTO,
    ImagedObjectDTO,
} from '@/dtos/sqe-dtos';

const st = StateManager.instance;
const svc = st.prepare;

function makeArtefactDto(over: Partial<ArtefactDTO> = {}): ArtefactDTO {
    return {
        id: 1,
        name: 'frg 1',
        editionId: 100,
        imagedObjectId: 'IO-1',
        imageId: 1,
        artefactDataEditorId: 1,
        mask: '',
        artefactMaskEditorId: 1,
        isPlaced: true,
        placement: { scale: 1, rotate: 0, translate: { x: 0, y: 0 }, zIndex: 0, mirrored: false },
        artefactPlacementEditorId: 1,
        side: 'recto',
        statusMessage: '',
        ...over,
    } as ArtefactDTO;
}

function art(id: number, over: Partial<ArtefactDTO> = {}): Artefact {
    return new Artefact(makeArtefactDto({ id, ...over }));
}

function makeEditionDto(over: Partial<EditionDTO> = {}): EditionDTO {
    return {
        id: 100,
        name: 'ed',
        manuscriptId: 1,
        editionDataEditorId: 1,
        permission: { mayRead: true, mayWrite: true, isAdmin: true },
        owner: { userId: 1, email: 'a@b.c' },
        shares: [],
        metrics: { width: 100, height: 100, xOrigin: 0, yOrigin: 0, ppi: 300, editorId: 1 },
        locked: false,
        isPublic: false,
        copyright: 'cc',
        lastEdit: '2020-01-01T00:00:00',
        ...over,
    } as EditionDTO;
}

function makeImagedObjectDto(id: string): ImagedObjectDTO {
    return { id, recto: { images: [] }, verso: { images: [] }, artefacts: [] } as unknown as ImagedObjectDTO;
}

function setCurrentEdition(id = 100) {
    const edition = new EditionInfo(makeEditionDto({ id }));
    st.editions.items = [edition];
    st.editions.current = st.editions.find(id);
    return st.editions.current!;
}

// Reset the per-process caches inside StateService so each test starts fresh.
function resetProcesses() {
    const s = svc as any;
    for (const key of [
        'allEditionsProcess', 'editionProcess', 'invitationProcess',
        'imagedObjectsProcess', 'artefactsProcess', 'artefactProcess',
        'textFragmentsProcess', 'textFragmentProcess', 'artefactGroupsProcess',
        'attributeMetadataProcess', 'editionScriptProcess',
        'editionFullTextProcess', 'editionMetadataProcess',
    ]) {
        s[key] = undefined;
    }
    s.imageManifestProcesses = new Map();
    s.maskInFlight = new Map();
    s.pendingMaskIds = new Set();
    s.pendingMaskFlush = null;
}

beforeEach(() => {
    vi.clearAllMocks();
    st.editions.items = [];
    st.artefacts.items = [];
    st.imagedObjects.items = [];
    st.textFragments.clear();
    st.signInterpretations.clear();
    st.interpretationRois.clear();
    st.artefactGroups.clear();
    resetProcesses();
});

// ---------------------------------------------------------------------------
// Lazy artefact-mask loading
// ---------------------------------------------------------------------------
describe('artefactMask (lazy per-artefact + bulk)', () => {
    it('resolves immediately when the mask is already loaded', async () => {
        const a = art(1, { mask: 'POLYGON((0 0,10 0,10 10,0 10,0 0))' });
        expect(a.maskLoaded).toBe(true);
        await svc.artefactMask(a);
        expect(artefactSvc.getArtefactMask).not.toHaveBeenCalled();
        expect(artefactSvc.getEditionArtefactMasks).not.toHaveBeenCalled();
    });

    it('resolves immediately for a virtual artefact', async () => {
        const a = art(2, { imagedObjectId: '' });
        expect(a.isVirtual).toBe(true);
        await svc.artefactMask(a);
        expect(artefactSvc.getArtefactMask).not.toHaveBeenCalled();
    });

    it('small batch: fetches each mask individually and applies it', async () => {
        const a = art(3, { editionId: 100, mask: '' });
        st.artefacts.items = [a];
        artefactSvc.getArtefactMask.mockResolvedValue('POLYGON((1 1,2 1,2 2,1 2,1 1))');
        await svc.artefactMask(st.artefacts.find(3)!);
        expect(artefactSvc.getArtefactMask).toHaveBeenCalledWith(100, 3);
        expect(artefactSvc.getEditionArtefactMasks).not.toHaveBeenCalled();
        expect(st.artefacts.find(3)!.maskLoaded).toBe(true);
    });

    it('coalesces concurrent requests for the same artefact (in-flight dedup)', async () => {
        const a = art(4, { editionId: 100, mask: '' });
        st.artefacts.items = [a];
        artefactSvc.getArtefactMask.mockResolvedValue('POLYGON((0 0,1 0,1 1,0 1,0 0))');
        const target = st.artefacts.find(4)!;
        const p1 = svc.artefactMask(target);
        const p2 = svc.artefactMask(target); // hits maskInFlight branch
        await Promise.all([p1, p2]);
        // Only one network fetch despite two calls.
        expect(artefactSvc.getArtefactMask).toHaveBeenCalledTimes(1);
    });

    it('large batch (>= threshold): one bulk request applied by id', async () => {
        const artefacts: Artefact[] = [];
        for (let i = 1; i <= 45; i++) {
            artefacts.push(art(i, { editionId: 100, mask: '' }));
        }
        st.artefacts.items = artefacts;
        const dtos = st.artefacts.items.map(a =>
            makeArtefactDto({ id: a.id, mask: 'POLYGON((0 0,3 0,3 3,0 3,0 0))' }),
        );
        artefactSvc.getEditionArtefactMasks.mockResolvedValue(dtos);
        await svc.ensureArtefactMasks(st.artefacts.items);
        expect(artefactSvc.getEditionArtefactMasks).toHaveBeenCalledWith(100);
        expect(artefactSvc.getArtefactMask).not.toHaveBeenCalled();
        expect(st.artefacts.find(1)!.maskLoaded).toBe(true);
        expect(st.artefacts.find(45)!.maskLoaded).toBe(true);
    });

    it('ensureArtefactMasks resolves with nothing to do', async () => {
        await expect(svc.ensureArtefactMasks([])).resolves.toBeUndefined();
    });
});

// ---------------------------------------------------------------------------
// Internal loaders — success + wrong-edition error branches
// ---------------------------------------------------------------------------
describe('editionScript', () => {
    it('loads the first script into the current edition', async () => {
        setCurrentEdition();
        editionSvc.getScribalFont.mockResolvedValue({
            scripts: [{
                glyphs: [{ character: 'א', yOffset: 0, shape: 'POLYGON((0 0,1 0,1 1,0 1,0 0))' }],
                kerningPairs: [],
                lineSpace: 1,
                wordSpace: 1,
            }],
        });
        await svc.editionScript(100);
        expect(st.editions.current!.script).not.toBeNull();
    });

    it('warns (leaves script null) when the edition has no script data', async () => {
        setCurrentEdition();
        editionSvc.getScribalFont.mockResolvedValue({ scripts: [] });
        await svc.editionScript(100);
        expect(st.editions.current!.script).toBeNull();
    });

    it('throws for a non-current edition', async () => {
        setCurrentEdition(100);
        await expect(svc.editionScript(999)).rejects.toThrow(/non-current edition/);
    });
});

describe('editionMetadata', () => {
    it('stores the metadata dto', async () => {
        setCurrentEdition();
        const dto = { some: 'meta' } as any;
        editionSvc.getEditionMetadata.mockResolvedValue(dto);
        await svc.editionMetadata(100);
        expect(st.editions.current!.metadata).toEqual(dto);
    });

    it('throws for a non-current edition', async () => {
        setCurrentEdition(100);
        await expect(svc.editionMetadata(42)).rejects.toThrow(/non-current edition/);
    });
});

describe('textFragments (list)', () => {
    it('stores the fragments on the current edition', async () => {
        setCurrentEdition();
        const fragments = [{ id: 1 }, { id: 2 }] as any;
        textSvc.getEditionTextFragments.mockResolvedValue(fragments);
        await svc.textFragments(100);
        expect(st.editions.current!.textFragments!.map(f => f.id)).toEqual([1, 2]);
    });

    it('throws for a non-current edition', async () => {
        setCurrentEdition(100);
        await expect(svc.textFragments(7)).rejects.toThrow(/text fragments for non-current/);
    });
});

describe('artefactGroups', () => {
    it('stores the groups on the current edition', async () => {
        setCurrentEdition();
        const groups = [{ groupId: 1 }] as any;
        editionSvc.getArtefactGroups.mockResolvedValue(groups);
        await svc.artefactGroups(100);
        expect(st.editions.current!.artefactGroups.map((g: any) => g.groupId)).toEqual([1]);
    });

    it('throws for a non-current edition', async () => {
        setCurrentEdition(100);
        await expect(svc.artefactGroups(8)).rejects.toThrow(/artefact Groups for non-current/);
    });
});

describe('attributeMetadata', () => {
    it('builds AttributeMetadata onto the current edition', async () => {
        setCurrentEdition();
        editionSvc.getAllAttributeMetadata.mockResolvedValue({ attributes: [] });
        await svc.attributeMetadata(100);
        expect(st.editions.current!.attributeMetadata).toBeTruthy();
    });

    it('throws with the wrong edition in the store', async () => {
        setCurrentEdition(100);
        await expect(svc.attributeMetadata(55)).rejects.toThrow(/atribute metadata/);
    });
});

describe('artefacts (list)', () => {
    it('loads artefacts into the store', async () => {
        const items = [art(10), art(11)];
        artefactSvc.getEditionArtefacts.mockResolvedValue(items);
        await svc.artefacts(100);
        expect(st.artefacts.items.map(a => a.id).sort()).toEqual([10, 11]);
    });
});

// ---------------------------------------------------------------------------
// imagedObjectsInternal + linkArtefactsToImagedObjects
// ---------------------------------------------------------------------------
describe('imagedObjects + artefact linking', () => {
    it('links loaded artefacts into their imaged objects by imagedObjectId', async () => {
        const edition = setCurrentEdition();
        // Two artefacts on IO-1, one virtual (no imagedObjectId).
        st.artefacts.items = [
            art(20, { imagedObjectId: 'IO-1' }),
            art(21, { imagedObjectId: 'IO-1' }),
            art(22, { imagedObjectId: '' }),
        ];
        const io = new ImagedObject(makeImagedObjectDto('IO-1'), edition);
        imagedObjectSvc.getEditionImagedObjects.mockResolvedValue([io]);
        await svc.imagedObjects(100);
        const stored = st.imagedObjects.find('IO-1')!;
        expect(stored.artefacts.map(a => a.id).sort()).toEqual([20, 21]);
    });
});

// ---------------------------------------------------------------------------
// imageManifest dedup / early return
// ---------------------------------------------------------------------------
describe('imageManifest', () => {
    function fakeImage(manifestUrl: string, manifest: any = undefined) {
        return { manifestUrl, manifest } as any;
    }

    it('fetches and stores the manifest when absent', async () => {
        const image = fakeImage('http://iiif/x/manifest');
        imageSvc.getImageManifest.mockResolvedValue({ id: 'm1' });
        await svc.imageManifest(image);
        expect(image.manifest).toEqual({ id: 'm1' });
    });

    it('short-circuits inside the loader when the image already has a manifest', async () => {
        const image = fakeImage('http://iiif/y/manifest', { id: 'pre' });
        await svc.imageManifest(image);
        expect(imageSvc.getImageManifest).not.toHaveBeenCalled();
    });

    it('reuses the tracked process for a repeated url once a manifest exists', async () => {
        const image = fakeImage('http://iiif/z/manifest');
        imageSvc.getImageManifest.mockResolvedValue({ id: 'mz' });
        await svc.imageManifest(image);
        // now image.manifest is set and the process is cached -> second call no-ops
        await svc.imageManifest(image);
        expect(imageSvc.getImageManifest).toHaveBeenCalledTimes(1);
    });
});

// ---------------------------------------------------------------------------
// wrapInternal caching / postInternal / refresh-on-failure
// ---------------------------------------------------------------------------
describe('wrapInternal behaviour (via allEditions)', () => {
    it('caches the process and does not re-run the loader on a second call', async () => {
        editionSvc.getAllEditions.mockResolvedValue([]);
        await svc.allEditions();
        await svc.allEditions();
        expect(editionSvc.getAllEditions).toHaveBeenCalledTimes(1);
    });

    it('re-runs the loader after a failed process (needsRefresh)', async () => {
        editionSvc.getAllEditions.mockRejectedValueOnce(new Error('boom'));
        await expect(svc.allEditions()).rejects.toThrow('boom');
        editionSvc.getAllEditions.mockResolvedValueOnce([]);
        await svc.allEditions();
        expect(editionSvc.getAllEditions).toHaveBeenCalledTimes(2);
    });
});

// ---------------------------------------------------------------------------
// editionInternal happy path + not-found error path (alert + router.push)
// ---------------------------------------------------------------------------
describe('edition (full internal pipeline)', () => {
    it('loads all sub-resources and subscribes to the edition', async () => {
        editionSvc.getAllEditions.mockResolvedValue([new EditionInfo(makeEditionDto({ id: 100 }))]);
        artefactSvc.getEditionArtefacts.mockResolvedValue([]);
        textSvc.getEditionTextFragments.mockResolvedValue([]);
        editionSvc.getArtefactGroups.mockResolvedValue([]);
        editionSvc.getAllAttributeMetadata.mockResolvedValue({ attributes: [] });
        editionSvc.getScribalFont.mockResolvedValue({ scripts: [] });
        editionSvc.getEditionMetadata.mockResolvedValue({} as any);

        await svc.edition(100);

        expect(st.editions.current!.id).toBe(100);
        expect(signalr.subscribeEdition).toHaveBeenCalledWith(100);
    });

    it('alerts and redirects home when the edition is missing from all editions', async () => {
        const alertSpy = vi.fn();
        (globalThis as any).alert = alertSpy;
        editionSvc.getAllEditions.mockResolvedValue([]); // edition 100 absent
        await svc.edition(100);
        expect(alertSpy).toHaveBeenCalled();
        expect(routerPush).toHaveBeenCalledWith('/');
    });
});

// ---------------------------------------------------------------------------
// editionFullText -> addTextFragmentToState populates SI + ROI maps
// ---------------------------------------------------------------------------
describe('editionFullText', () => {
    it('adds every text fragment (with its signs/SIs/ROIs) to the state', async () => {
        editionSvc.getAllEditions.mockResolvedValue([new EditionInfo(makeEditionDto({ id: 100 }))]);
        // edition() runs its full pipeline; stub the rest.
        artefactSvc.getEditionArtefacts.mockResolvedValue([]);
        textSvc.getEditionTextFragments.mockResolvedValue([]);
        editionSvc.getArtefactGroups.mockResolvedValue([]);
        editionSvc.getAllAttributeMetadata.mockResolvedValue({ attributes: [] });
        editionSvc.getScribalFont.mockResolvedValue({ scripts: [] });
        editionSvc.getEditionMetadata.mockResolvedValue({} as any);

        st.artefacts.items = [art(1, { imagedObjectId: 'IO-1' })];
        const roi = {
            id: 900,
            interpretationRoiId: 900,
            artefactId: 1,
            signInterpretationId: 800,
            shape: 'POLYGON((0 0,1 0,1 1,0 1,0 0))',
            translate: { x: 0, y: 0 },
            stanceRotation: 0,
            exceptional: false,
            valuesSet: true,
            creatorId: 1,
            editorId: 1,
        };
        const tf = {
            id: 500,
            textFragmentName: 'tf',
            lines: [
                {
                    signs: [
                        {
                            signInterpretations: [
                                { id: 800, signInterpretationId: 800, rois: [roi] },
                            ],
                        },
                    ],
                },
            ],
        };
        textSvc.getEditionFullText.mockResolvedValue({ textFragments: [tf] });

        await svc.editionFullText(100);

        expect(st.textFragments.get(500)).toBeTruthy();
        expect(st.signInterpretations.get(800)).toBeTruthy();
        expect(st.interpretationRois.get(900)).toBeTruthy();
    });
});

// Stub every service call the edition() pipeline makes, seeding edition 100.
function stubEditionPipeline(artefacts: Artefact[] = [], imagedObjects: ImagedObject[] = []) {
    editionSvc.getAllEditions.mockResolvedValue([new EditionInfo(makeEditionDto({ id: 100 }))]);
    artefactSvc.getEditionArtefacts.mockResolvedValue(artefacts);
    textSvc.getEditionTextFragments.mockResolvedValue([]);
    editionSvc.getArtefactGroups.mockResolvedValue([]);
    editionSvc.getAllAttributeMetadata.mockResolvedValue({ attributes: [] });
    editionSvc.getScribalFont.mockResolvedValue({ scripts: [] });
    editionSvc.getEditionMetadata.mockResolvedValue({} as any);
    imagedObjectSvc.getEditionImagedObjects.mockResolvedValue(imagedObjects);
}

// ---------------------------------------------------------------------------
// artefact() — virtual path + error paths + postArtefactInternal
// ---------------------------------------------------------------------------
describe('artefact (single)', () => {
    it('loads a virtual artefact (no imaged object) and sets it current', async () => {
        const virtual = art(70, { imagedObjectId: '', editionId: 100 });
        stubEditionPipeline([virtual]);
        textSvc.getArtefactTextFragments.mockResolvedValue([]);
        await svc.artefact(100, 70);
        expect(st.artefacts.current!.id).toBe(70);
        expect(st.imagedObjects.current).toBeNull();
    });

    it('throws when the artefact is not in the edition', async () => {
        stubEditionPipeline([]);
        await expect(svc.artefact(100, 999)).rejects.toThrow(/located artefact 999/);
    });

    it('throws when a non-virtual artefact has no imaged object loaded', async () => {
        const placed = art(71, { imagedObjectId: 'IO-MISSING', editionId: 100 });
        stubEditionPipeline([placed], []); // no imaged objects
        textSvc.getArtefactTextFragments.mockResolvedValue([]);
        await expect(svc.artefact(100, 71)).rejects.toThrow(/locate imaged object/);
    });
});

// ---------------------------------------------------------------------------
// textFragment() — early return, error, and full load path
// ---------------------------------------------------------------------------
describe('textFragment (single)', () => {
    it('returns early when the fragment is already fully loaded (has content)', async () => {
        stubEditionPipeline();
        // Run edition() first (it clears the fragment map), then seed the map with a fragment
        // that HAS lines so the second textFragment() call takes the already-loaded early return.
        // (A metadata-only entry — 0 lines, e.g. from a CreatedTextFragment broadcast — instead
        // falls through and re-fetches its content; covered by the realtime-text e2e.)
        await svc.edition(100);
        st.textFragments.put({ id: 400, lines: [{ lineId: 1 }] } as any);
        await svc.textFragment(100, 400);
        expect(textSvc.getTextFragment).not.toHaveBeenCalled();
    });

    it('throws when the fragment id is not part of the edition', async () => {
        stubEditionPipeline();
        // edition().textFragments is [] -> the guard for textFragmentData fails
        await expect(svc.textFragment(100, 12345)).rejects.toThrow(/located text fragment ID 12345/);
    });

    it('loads the fragment from the server and adds it to state', async () => {
        editionSvc.getAllEditions.mockResolvedValue([new EditionInfo(makeEditionDto({ id: 100 }))]);
        artefactSvc.getEditionArtefacts.mockResolvedValue([]);
        // The edition must list fragment 410 so the existence guard passes.
        textSvc.getEditionTextFragments.mockResolvedValue([{ id: 410, textFragmentName: 'tf' }] as any);
        editionSvc.getArtefactGroups.mockResolvedValue([]);
        editionSvc.getAllAttributeMetadata.mockResolvedValue({ attributes: [] });
        editionSvc.getScribalFont.mockResolvedValue({ scripts: [] });
        editionSvc.getEditionMetadata.mockResolvedValue({} as any);
        textSvc.getTextFragment.mockResolvedValue({
            textFragments: [{ id: 410, textFragmentName: 'tf', lines: [] }],
        });
        await svc.textFragment(100, 410);
        expect(st.textFragments.get(410)).toBeTruthy();
    });

    it('throws when the backend returns the wrong fragment', async () => {
        editionSvc.getAllEditions.mockResolvedValue([new EditionInfo(makeEditionDto({ id: 100 }))]);
        artefactSvc.getEditionArtefacts.mockResolvedValue([]);
        textSvc.getEditionTextFragments.mockResolvedValue([{ id: 411, textFragmentName: 'tf' }] as any);
        editionSvc.getArtefactGroups.mockResolvedValue([]);
        editionSvc.getAllAttributeMetadata.mockResolvedValue({ attributes: [] });
        editionSvc.getScribalFont.mockResolvedValue({ scripts: [] });
        editionSvc.getEditionMetadata.mockResolvedValue({} as any);
        textSvc.getTextFragment.mockResolvedValue({
            textFragments: [{ id: 999, lines: [] }], // mismatched id
        });
        await expect(svc.textFragment(100, 411)).rejects.toThrow(/one expected text fragment/);
    });
});

// ---------------------------------------------------------------------------
// invitations
// ---------------------------------------------------------------------------
describe('invitations', () => {
    it('maps this edition\'s editor requests into ShareInfo entries', async () => {
        editionSvc.getAllEditions.mockResolvedValue([new EditionInfo(makeEditionDto({ id: 100 }))]);
        artefactSvc.getEditionArtefacts.mockResolvedValue([]);
        textSvc.getEditionTextFragments.mockResolvedValue([]);
        editionSvc.getArtefactGroups.mockResolvedValue([]);
        editionSvc.getAllAttributeMetadata.mockResolvedValue({ attributes: [] });
        editionSvc.getScribalFont.mockResolvedValue({ scripts: [] });
        editionSvc.getEditionMetadata.mockResolvedValue({} as any);
        editionSvc.getAllInvitations.mockResolvedValue({
            editorRequests: [
                { editionId: 100, editorEmail: 'x@x.com', mayRead: true, mayWrite: false, isAdmin: false, mayLock: false },
                { editionId: 999, editorEmail: 'other@x.com', mayRead: true, mayWrite: false, isAdmin: false, mayLock: false },
            ],
        });

        await svc.invitations(100);
        const ed = st.editions.find(100)!;
        expect(ed.invitations.map(i => i.email)).toEqual(['x@x.com']);
    });
});
