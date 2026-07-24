import { describe, it, expect } from 'vitest';
import { ApiRoutes } from '@/services/api-routes';

describe('ApiRoutes — pure URL builders', () => {
    it('allEditionsUrl', () => {
        expect(ApiRoutes.allEditionsUrl()).toBe('v1/editions');
    });

    it('manuscriptEditions', () => {
        expect(ApiRoutes.manuscriptEditions(42)).toBe('v1/manuscripts/42/editions');
    });

    it('editionUrl — bare', () => {
        expect(ApiRoutes.editionUrl(7)).toBe('v1/editions/7');
    });

    it('editionUrl — archiveForAllEditors only', () => {
        expect(ApiRoutes.editionUrl(7, true)).toBe(
            'v1/editions/7?optional=archiveForAllEditors'
        );
    });

    it('editionUrl — token only', () => {
        expect(ApiRoutes.editionUrl(7, false, 'abc')).toBe(
            'v1/editions/7?token=abc'
        );
    });

    it('editionUrl — archive + token', () => {
        expect(ApiRoutes.editionUrl(7, true, 'abc')).toBe(
            'v1/editions/7?optional=archiveForAllEditors&token=abc'
        );
    });

    it('editionArtefactUrl — without mask', () => {
        expect(ApiRoutes.editionArtefactUrl(1, 2)).toBe(
            'v1/editions/1/artefacts/2'
        );
    });

    it('editionArtefactUrl — with mask', () => {
        expect(ApiRoutes.editionArtefactUrl(1, 2, true)).toBe(
            'v1/editions/1/artefacts/2?optional=masks'
        );
    });

    it('allEditionArtefactMasksUrl', () => {
        expect(ApiRoutes.allEditionArtefactMasksUrl(5)).toBe(
            '/v1/editions/5/artefacts?optional=masks'
        );
    });

    it('editionMetadataUrl', () => {
        expect(ApiRoutes.editionMetadataUrl(5)).toBe('v1/editions/5/metadata');
    });

    it('editionFullTextUrl', () => {
        expect(ApiRoutes.editionFullTextUrl(5)).toBe('v1/editions/5/full-text');
    });

    it('editionRequestEditor', () => {
        expect(ApiRoutes.editionRequestEditor(5)).toBe(
            'v1/editions/5/add-editor-request'
        );
    });

    it('confirmAddEditionEditorUrl', () => {
        expect(ApiRoutes.confirmAddEditionEditorUrl('tok')).toBe(
            'v1/editions/confirm-editorship/tok'
        );
    });

    it('editionUpdateEditor', () => {
        expect(ApiRoutes.editionUpdateEditor(5, 'a@b.com')).toBe(
            'v1/editions/5/editors/a@b.com'
        );
    });

    it('listInvitationEditionUrl', () => {
        expect(ApiRoutes.listInvitationEditionUrl()).toBe(
            'v1/editions/admin-share-requests'
        );
    });

    it('allEditionArtefactsUrl — bare', () => {
        expect(ApiRoutes.allEditionArtefactsUrl(5)).toBe('/v1/editions/5/artefacts');
    });

    it('allEditionArtefactsUrl — images', () => {
        expect(ApiRoutes.allEditionArtefactsUrl(5, 'images')).toBe(
            '/v1/editions/5/artefacts?optional=images'
        );
    });

    it('allEditionArtefactsUrl — masks', () => {
        expect(ApiRoutes.allEditionArtefactsUrl(5, 'masks')).toBe(
            '/v1/editions/5/artefacts?optional=masks'
        );
    });

    it('editionImagedObjectUrl — without artefacts', () => {
        expect(ApiRoutes.editionImagedObjectUrl(5, 'IO-1')).toBe(
            'v1/editions/5/imaged-objects/IO-1'
        );
    });

    it('editionImagedObjectUrl — with artefacts', () => {
        expect(ApiRoutes.editionImagedObjectUrl(5, 'IO-1', true)).toBe(
            'v1/editions/5/imaged-objects/IO-1?optional=artefacts&optional=masks'
        );
    });

    it('allEditionImagedObjectsUrl — without artefacts', () => {
        expect(ApiRoutes.allEditionImagedObjectsUrl(5)).toBe(
            'v1/editions/5/imaged-objects'
        );
    });

    it('allEditionImagedObjectsUrl — with artefacts', () => {
        expect(ApiRoutes.allEditionImagedObjectsUrl(5, true)).toBe(
            'v1/editions/5/imaged-objects?optional=artefacts&optional=masks'
        );
    });

    it('loginUrl', () => {
        expect(ApiRoutes.loginUrl()).toBe('/v1/users/login');
    });

    it('usersUrl', () => {
        expect(ApiRoutes.usersUrl()).toBe('/v1/users');
    });

    it('forgotPasswordUrl', () => {
        expect(ApiRoutes.forgotPasswordUrl()).toBe('/v1/users/forgot-password');
    });

    it('changePasswordUrl', () => {
        expect(ApiRoutes.changePasswordUrl()).toBe('/v1/users/change-password');
    });

    it('changeForgottenPasswordUrl', () => {
        expect(ApiRoutes.changeForgottenPasswordUrl()).toBe(
            '/v1/users/change-forgotten-password'
        );
    });

    it('confirmRegistartionUrl', () => {
        expect(ApiRoutes.confirmRegistartionUrl()).toBe(
            '/v1/users/confirm-registration'
        );
    });

    it('allEditionTextFragmentsUrl', () => {
        expect(ApiRoutes.allEditionTextFragmentsUrl(5)).toBe(
            '/v1/editions/5/text-fragments'
        );
    });

    it('artefactTextFragmentsUrl — not suggested', () => {
        expect(ApiRoutes.artefactTextFragmentsUrl(5, 2, false)).toBe(
            'v1/editions/5/artefacts/2/text-fragments'
        );
    });

    it('artefactTextFragmentsUrl — suggested', () => {
        expect(ApiRoutes.artefactTextFragmentsUrl(5, 2, true)).toBe(
            'v1/editions/5/artefacts/2/text-fragments?optional=suggested'
        );
    });

    it('editionTextFragmentUrl', () => {
        expect(ApiRoutes.editionTextFragmentUrl(5, 9)).toBe(
            '/v1/editions/5/text-fragments/9'
        );
    });

    it('batchCreateRoisUrl', () => {
        expect(ApiRoutes.batchCreateRoisUrl(5)).toBe('/v1/editions/5/rois/batch');
    });

    it('createLine', () => {
        expect(ApiRoutes.createLine(5, 9)).toBe(
            '/v1/editions/5/text-fragments/9/lines'
        );
    });

    it('deleteLine', () => {
        expect(ApiRoutes.deleteLine(5, 9)).toBe('/v1/editions/5/lines/9');
    });

    it('batchEditRoisUrl', () => {
        expect(ApiRoutes.batchEditRoisUrl(5)).toBe('/v1/editions/5/rois/batch-edit');
    });

    it('roiUrl', () => {
        expect(ApiRoutes.roiUrl(5, 3)).toBe('/v1/editions/5/rois/3');
    });

    it('repairPolygonUrl', () => {
        expect(ApiRoutes.repairPolygonUrl()).toBe('/v1/utils/repair-wkt-polygon');
    });

    it('batchUpdateArtefactDTOs', () => {
        expect(ApiRoutes.batchUpdateArtefactDTOs(5)).toBe(
            '/v1/editions/5/artefacts/batch-transformation'
        );
    });

    it('artefactGroupUrl — without group', () => {
        expect(ApiRoutes.artefactGroupUrl(5)).toBe('/v1/editions/5/artefact-groups');
    });

    it('artefactGroupUrl — with group', () => {
        expect(ApiRoutes.artefactGroupUrl(5, 8)).toBe(
            '/v1/editions/5/artefact-groups/8'
        );
    });

    it('editionAttributeMetadataUrl', () => {
        expect(ApiRoutes.editionAttributeMetadataUrl(5)).toBe(
            '/v1/editions/5/sign-interpretations-attributes'
        );
    });

    it('attributeUrl — without value', () => {
        expect(ApiRoutes.attributeUrl(5, 3)).toBe(
            '/v1/editions/5/sign-interpretations/3/attributes'
        );
    });

    it('attributeUrl — with value', () => {
        expect(ApiRoutes.attributeUrl(5, 3, 7)).toBe(
            '/v1/editions/5/sign-interpretations/3/attributes/7'
        );
    });

    it('signInterpretationCommentaryUrl', () => {
        expect(ApiRoutes.signInterpretationCommentaryUrl(5, 3)).toBe(
            'v1/editions/5/sign-interpretations/3/commentary'
        );
    });

    it('signInterpretationUrl — without id', () => {
        expect(ApiRoutes.signInterpretationUrl(5)).toBe(
            'v1/editions/5/sign-interpretations'
        );
    });

    it('signInterpretationUrl — with id', () => {
        expect(ApiRoutes.signInterpretationUrl(5, 3)).toBe(
            'v1/editions/5/sign-interpretations/3'
        );
    });

    it('signInterpretationCharacterUrl', () => {
        expect(ApiRoutes.signInterpretationCharacterUrl(5, 3)).toBe(
            'v1/editions/5/sign-interpretations/3'
        );
    });

    it('searchUrl', () => {
        expect(ApiRoutes.searchUrl()).toBe('v1/search');
    });

    it('lineText', () => {
        expect(ApiRoutes.lineText(5, 9)).toBe('v1/editions/5/lines/9');
    });

    it('qwbWordVariantUrl', () => {
        expect(ApiRoutes.qwbWordVariantUrl(11)).toBe(
            'v1/qwb-proxy/words/11/word-variants'
        );
    });

    it('qwbParallelTextUrl', () => {
        expect(ApiRoutes.qwbParallelTextUrl(1, 2)).toBe(
            'v1/qwb-proxy/parallels/start-word/1/end-word/2'
        );
    });

    it('qwbBibliographyUrl', () => {
        expect(ApiRoutes.qwbBibliographyUrl(3)).toBe('v1/qwb-proxy/bibliography/3');
    });

    it('editionScirbalFontUrl', () => {
        expect(ApiRoutes.editionScirbalFontUrl(5)).toBe('v1/editions/5/scribalfonts');
    });

    it('diffReplaceTranscription', () => {
        expect(ApiRoutes.diffReplaceTranscription(5, 2)).toBe(
            'v1/editions/5/artefacts/2/diff-replace-transcription'
        );
    });

    it('diffReplaceText', () => {
        expect(ApiRoutes.diffReplaceText(5)).toBe('v1/editions/5/diff-replace-text');
    });

    it('reportProblemUrl', () => {
        expect(ApiRoutes.reportProblemUrl()).toBe('/v1/utils/report-github-issue');
    });
});
