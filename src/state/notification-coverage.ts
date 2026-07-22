import type { NotificationHandler } from './notification-handler';

/*
 * SINGLE SOURCE OF TRUTH for realtime notification coverage.
 *
 * Every server broadcast declared in ISQEClient (SQE_API) must appear in exactly
 * one of the two tables below:
 *   - HANDLED_EVENTS   : event name -> NotificationHandler method that processes it
 *   - UNHANDLED_EVENTS : event name -> intentionally logged-and-ignored (for now)
 *
 * The dependency-free guard in scripts/check-notification-coverage.js cross-checks
 * these tables against the generated connect* methods in src/dtos/sqe-signalr.ts,
 * so a new API event cannot land without an explicit client decision, and a stale
 * entry here cannot linger. See docs/realtime-state-sync-audit-and-plan.md.
 *
 * NOTE: this module has NO runtime imports (NotificationHandler is `import type`,
 * erased at build) so it stays cheap to import from anywhere.
 */

// Event name -> the NotificationHandler method invoked for it. These are the
// events the client actually processes today.
export const HANDLED_EVENTS: ReadonlyArray<[string, keyof NotificationHandler]> = [
    ['UpdatedEdition', 'handleUpdatedEdition'],
    ['CreatedArtefact', 'handleCreatedArtefact'],
    ['DeletedArtefact', 'handleDeletedArtefact'],
    ['UpdatedArtefact', 'handleUpdatedArtefact'],
    ['CreatedRoisBatch', 'handleCreatedRoisBatch'],
    ['EditedRoisBatch', 'handleEditedRoisBatch'],
    ['UpdatedRoisBatch', 'handleUpdatedRoisBatch'],
    ['DeletedRoi', 'handleDeletedRoi'],
    ['CreatedEditor', 'handleCreatedEditor'],
    ['UpdatedSignInterpretation', 'handleUpdatedSignInterpretation'],
    ['UpdatedSignInterpretations', 'handleUpdatedSignInterpretations'],
    ['DeletedSignInterpretation', 'handleDeletedSignInterpretation'],
    ['CreatedSignInterpretation', 'handleCreatedSignInterpretation'],
    ['CreatedArtefactGroup', 'handleCreatedArtefactGroup'],
    ['UpdatedArtefactGroup', 'handleUpdatedArtefactGroup'],
    ['DeletedArtefactGroup', 'handleDeletedArtefactGroup'],
];

// Broadcast by the API but intentionally not yet processed. Each is wired to a
// dev-only logger so an ignored broadcast is visible instead of silently dropped.
// To start handling one, move it into HANDLED_EVENTS and implement the method.
export const UNHANDLED_EVENTS: ReadonlyArray<string> = [
    // Tier A — lines & text fragments. NOT handled because their broadcast
    // payloads are under-specified for a safe client-side apply:
    //  - LineDataDTO carries no parent textFragmentId, so a CreatedLine cannot be
    //    attached to the right fragment. (UpdatedLine/DeletedLine could be done by
    //    id-search, but are kept here for symmetry until create is fixable.)
    //  - TextFragmentDataDTO is metadata only.
    // The fix is an API-payload change (add textFragmentId to LineDataDTO), tracked
    // with the P3 API work. (Artefact groups ARE handled — see HANDLED_EVENTS.)
    'CreatedLine', 'UpdatedLine', 'DeletedLine',
    'CreatedTextFragment', 'UpdatedTextFragment',
    // Tier B — real but less frequent (wire when needed). Note: sign-level
    // attribute *values* already propagate via UpdatedSignInterpretation; these
    // are edition-level attribute definitions.
    'CreatedImagedObject', 'DeletedImagedObject',
    'CreatedAttribute', 'UpdatedAttribute', 'DeletedAttribute',
    'RequestedEditor', 'UpdatedEditorEmail', 'CreatedEdition', 'DeletedEdition',
    // Tier C — scribal-font editor (specialized; wire when that feature is worked on)
    'CreatedScribalFontInfo', 'UpdatedScribalFontInfo',
    'CreatedScribalFontKerningPair', 'UpdatedScribalFontKerningPair', 'DeletedScribalFontKerningPair',
    'CreatedScribalFontGlyph', 'UpdatedScribalFontGlyph', 'DeletedScribalFontGlyph',
    'DeletedScribalFont',
    // Declared in ISQEClient but never actually broadcast by the server (it is
    // only the HTTP return type of BatchUpdateArtefactTransformAsync; batch
    // transforms are broadcast as UpdatedArtefact per artefact). Listed so the
    // coverage guard accounts for it; a handler here would never fire.
    'BatchUpdatedArtefactTransform',
];

// Every event the client has an explicit decision for.
export function allDispatchedEvents(): string[] {
    return [...HANDLED_EVENTS.map(([event]) => event), ...UNHANDLED_EVENTS];
}
