export namespace ApiRoutes {
    const baseUrl = 'v1';
    const editions = 'editions';
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


    export function allEditionsUrl() {
        return `${baseUrl}/${editions}`;
    }

    export function editionUrl(editionId: number) {
        return `${baseUrl}/${editions}/${editionId}`;
    }

    export function editionArtefactUrl(editionId: number, artefactId: number) {
        return `${baseUrl}/${editions}/${editionId}/${artefacts}/${artefactId}`;
    }

    export function allEditionArtefactsUrl(editionId: number, option: boolean = false) {
        if (option) {
            return `/${baseUrl}/${editions}/${editionId}/${artefacts}?${optionalArtefact}`;
        }
        return `/${baseUrl}/${editions}/${editionId}/${artefacts}`;
    }

    export function editionImagedObjectUrl(editionId: number, imagedObjectId: string, option: boolean = false) {
        if (option) {
            return `${baseUrl}/${editions}/${editionId}/${imagedObjects}/${imagedObjectId}?${optionalArtefact}`;
        }
        return `${baseUrl}/${editions}/${editionId}/${imagedObjects}/${imagedObjectId}`;
    }

    export function allEditionImagedObjectsUrl(editionId: number, option: boolean = false) {
        if (option) {
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

    export function editionTextFragmentUrl(editionId: number, textFragmentId: number) {
        return `/${baseUrl}/${editions}/${editionId}/${textFragments}/${textFragmentId}`;
    }
}
