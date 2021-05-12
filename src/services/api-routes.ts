export namespace ApiRoutes {
    const baseUrl = 'v1';
    const editions = 'editions';
    const utils = 'utils';
    const artefacts = 'artefacts';
    const imagedObjects = 'imaged-objects';
    const textFragments = 'text-fragments';
    const users = 'users';
    const login = 'login';
    const forgotPassword = 'forgot-password';
    const changePassword = 'change-password';
    const changeForgottenPassword = 'change-forgotten-password';
    const confirmRegistration = 'confirm-registration';
    const optionalArtefact = 'optional=artefacts&optional=masks';
    const confirmAddEditionEditor = 'confirm-editorship';
    const listInvitationEdition = 'admin-share-requests';

    export function allEditionsUrl() {
        return `${baseUrl}/${editions}`;
    }

    export function editionUrl(editionId: number) {
        return `${baseUrl}/${editions}/${editionId}`;
    }

    export function editionArtefactUrl(editionId: number, artefactId: number) {
        return `${baseUrl}/${editions}/${editionId}/${artefacts}/${artefactId}`;
    }

    export function editionFullTextUrl(editionId: number) {
        return `${baseUrl}/${editions}/${editionId}/full-text`;
    }

    export function editionRequestEditor(editionId: number) {
        return `${baseUrl}/${editions}/${editionId}/add-editor-request`;
    }

    export function confirmAddEditionEditorUrl(token: string) {
        return `${baseUrl}/${editions}/${confirmAddEditionEditor}/${token}`;
    }

    export function editionUpdateEditor(editionId: number, email: string) {
        return `${baseUrl}/${editions}/${editionId}/editors/${email}`;
    }

    export function listInvitationEditionUrl() {
        return `${baseUrl}/${editions}/${listInvitationEdition}`;
    }

    export function allEditionArtefactsUrl(editionId: number, option: boolean = false) {
        if (option) {
            return `/${baseUrl}/${editions}/${editionId}/${artefacts}?${optionalArtefact}`;
        }
        return `/${baseUrl}/${editions}/${editionId}/${artefacts}`;
    }

    export function editionImagedObjectUrl(
        editionId: number,
        imagedObjectId: string,
        includeArtefacts: boolean = false) {
        if (includeArtefacts) {
            return `${baseUrl}/${editions}/${editionId}/${imagedObjects}/${imagedObjectId}?${optionalArtefact}`;
        }
        return `${baseUrl}/${editions}/${editionId}/${imagedObjects}/${imagedObjectId}`;
    }

    export function allEditionImagedObjectsUrl(editionId: number, includeArtefacts: boolean = false) {
        if (includeArtefacts) {
            return `${baseUrl}/${editions}/${editionId}/${imagedObjects}?${optionalArtefact}`;
        }
        return `${baseUrl}/${editions}/${editionId}/${imagedObjects}`;
    }

    export function loginUrl() {
        return `/${baseUrl}/${users}/${login}`;
    }

    export function usersUrl() {
        return `/${baseUrl}/${users}`;
    }

    export function forgotPasswordUrl() {
        return `/${baseUrl}/${users}/${forgotPassword}`;
    }

    export function changePasswordUrl() {
        return `/${baseUrl}/${users}/${changePassword}`;
    }

    export function changeForgottenPasswordUrl() {
        return `/${baseUrl}/${users}/${changeForgottenPassword}`;
    }

    export function confirmRegistartionUrl() {
        return `/${baseUrl}/${users}/${confirmRegistration}`;
    }

    export function allEditionTextFragmentsUrl(editionId: number) {
        return `/${baseUrl}/${editions}/${editionId}/${textFragments}`;
    }

    export function artefactTextFragmentsUrl(editionId: number, artefactId: number) {
        return `${baseUrl}/${editions}/${editionId}/${artefacts}/${artefactId}/text-fragments`;
    }

    export function editionTextFragmentUrl(editionId: number, textFragmentId: number) {
        return `/${baseUrl}/${editions}/${editionId}/${textFragments}/${textFragmentId}`;
    }

    export function batchCreateRoisUrl(editionId: number) {
        return `/${baseUrl}/${editions}/${editionId}/rois/batch`;
    }

    export function batchEditRoisUrl(editionId: number) {
        return `/${baseUrl}/${editions}/${editionId}/rois/batch-edit`;
    }

    export function roiUrl(editionId: number, roiId: number) {
        return `/${baseUrl}/${editions}/${editionId}/rois/${roiId}`;
    }

    export function repairPolygonUrl() {
        return `/${baseUrl}/${utils}/repair-wkt-polygon`;
    }

    export function batchUpdateArtefactDTOs(editionId: number) {
        return `/${baseUrl}/${editions}/${editionId}/${artefacts}/batch-transformation`;
    }

    export function artefactGroupUrl(editionId: number, groupId?: number) {
        let url = `/${baseUrl}/${editions}/${editionId}/artefact-groups`; /* correct the api-route in the backend*/
        if (groupId) {
            url += `/${groupId}`;
        }

        return url;
    }

    export function editionAttributeMetadataUrl(editionId: number) {
        return `/${baseUrl}/${editions}/${editionId}/sign-interpretations-attributes`;
    }

    export function attributeUrl(editionId: number, signInterpretationId: number, attributeValueId?: number) {
        let url = `/${baseUrl}/${editions}/${editionId}/sign-interpretations/${signInterpretationId}/attributes`;

        if (attributeValueId) {
            url += `/${attributeValueId}`;
        }

        return url;
    }

    export function signInterpretationCommentaryUrl(editionId: number, signInterpretationId: number) {
        const url = `v1/editions/${editionId}/sign-interpretations/${signInterpretationId}/commentary`;

        return url;
    }

    export function signInterpretationUrl(editionId: number, signInterpretationId?: number) {
        let url = `v1/editions/${editionId}/sign-interpretations`;
        if (signInterpretationId) {
            url += `/${signInterpretationId}`;
        }

        return url;
    }

    export function signInterpretationCharacterUrl(editionId: number, signInterpretationId: number) {
        const url = `v1/editions/${editionId}/sign-interpretations/${signInterpretationId}`;

        return url;
    }

    export function searchUrl() {
        return 'v1/search';
    }

    export function editionScirbalFontUrl(editionId: number) {
        const url = `v1/editions/${editionId}/scribalfonts`;

        return url;
    }

    export function diffReplaceTextUrl(editionId: number) {
        const url = `v1/editions/${editionId}/diff-replace-text`;

        return url;
    }
}
