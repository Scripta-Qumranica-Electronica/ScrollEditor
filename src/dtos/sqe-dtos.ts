// This file was generate automatically. DO NOT EDIT.
/* tslint:disable */

export interface ArtefactDTO {
    id: number;
    editionId: number;
    imagedObjectId: string;
    imageId: number;
    artefactDataEditorId: number;
    name: string;
    mask: PolygonDTO;
    zOrder: number;
    side: string;
}

export interface ArtefactListDTO {
    artefacts: ArtefactDTO[];
}
export interface UpdateArtefactDTO {
    mask: string;
    name: string;
    position: string;
}
export interface CreateArtefactDTO {
    masterImageId: number;
    mask: string;
    name: string;
    position: string;
}

export interface EditionDTO {
    id: number;
    name: string;
    editionDataEditorId: number;
    permission: PermissionDTO;
    owner: UserDTO;
    thumbnailUrl: string;
    shares: ShareDTO[];
    locked: boolean;
    isPublic: boolean;
    lastEdit: string;
    copyright: string;
}

export interface EditionGroupDTO {
    primary: EditionDTO;
    others: EditionDTO[];
}

export interface EditionListDTO {
    editions: Array<EditionDTO>[];
}
export interface PermissionDTO {
    mayWrite: boolean;
    isAdmin: boolean;
}
export interface EditorRightsDTO {
    email: string;
    mayRead?: boolean;
    isAdmin?: boolean;
    mayLock?: boolean;
    mayWrite?: boolean;
}

export interface TextEditionDTO {
    manuscriptId: number;
    editionName: string;
    editorId: number;
    licence: string;
    editors: { [key: number] : EditorDTO };
    textFragments: TextFragmentDTO[];
}

export interface ShareDTO {
    user: UserDTO;
    permission: PermissionDTO;
}
export interface DeleteTokenDTO {
    editionId: number;
    token: string;
}
export interface EditionUpdateRequestDTO {
    name: string;
    copyrightHolder: string;
    collaborators: string;
}

export interface EditionCopyDTO extends EditionUpdateRequestDTO {
}

export interface ImageDTO {
    id: number;
    url: string;
    imageToImageMapEditorId?: number;
    lightingType: Lighting;
    lightingDirection: Direction;
    waveLength: string[];
    type: string;
    side: string;
    regionInMasterImage: string;
    regionInImage: string;
    transformToMaster: string;
    master: boolean;
    catalogNumber: number;
}
export interface ImageInstitutionDTO {
    name: string;
}

export interface ImageInstitutionListDTO {
    institutions: ImageInstitutionDTO[];
}

export interface ImageStackDTO {
    id?: number;
    images: ImageDTO[];
    masterIndex?: number;
}

export interface ImagedObjectDTO {
    id: string;
    recto: ImageStackDTO;
    verso: ImageStackDTO;
    artefacts: ArtefactDTO[];
}

export interface ImagedObjectListDTO {
    imagedObjects: ImagedObjectDTO[];
}
export interface PolygonDTO {
    mask: string;
    maskEditorId: number;
    transformMatrix: string;
    transformMatrixEditorId: number;
}

export interface SignDTO {
    signInterpretations: SignInterpretationDTO[];
}
export interface NextSignInterpretationDTO {
    nextSignInterpretationId: number;
    editorId: number;
}

export interface SignInterpretationDTO {
    signInterpretationId: number;
    character: string;
    attributes: InterpretationAttributeDTO[];
    rois: InterpretationRoiDTO[];
    nextSignInterpretations: NextSignInterpretationDTO[];
}
export interface InterpretationAttributeDTO {
    interpretationAttributeId: number;
    sequence: number;
    attributeValueId: number;
    editorId: number;
    value: number;
}
export interface InterpretationRoiDTO {
    interpretationRoiId: number;
    editorId: number;
    artefactId: number;
    shape: string;
    position: string;
    exceptional: boolean;
    valuesSet: boolean;
}
export interface TextFragmentDataDTO {
    id: number;
    name: string;
    editorId: number;
}

export interface TextFragmentDataListDTO {
    textFragments: TextFragmentDataDTO[];
}

export interface TextFragmentDTO {
    textFragmentId: number;
    textFragmentName: string;
    editorId: number;
    lines: LineDTO[];
}
export interface LineDataDTO {
    lineId: number;
    lineName: string;
}

export interface LineDataListDTO {
    lines: LineDataDTO[];
}

export interface LineDTO {
    lineId: number;
    lineName: string;
    editorId: number;
    signs: SignDTO[];
}

export interface LineTextDTO extends LineDTO {
    licence: string;
    editors: { [key: number] : EditorDTO };
}
export interface CreateTextFragmentDTO {
    name: string;
    previousTextFragmentId?: number;
    nextTextFragmentId?: number;
}
export interface LoginRequestDTO {
    email: string;
    password: string;
}
export interface NewUserRequestDTO {
    password: string;
    email: string;
    organization: string;
    forename: string;
    surname: string;
}

export interface UserUpdateRequestDTO extends NewUserRequestDTO {
}
export interface AccountActivationRequestDTO {
    token: string;
}
export interface ResendUserAccountActivationRequestDTO {
    email: string;
}

export interface UnactivatedEmailUpdateRequestDTO extends ResendUserAccountActivationRequestDTO {
    newEmail: string;
}
export interface ResetUserPasswordRequestDTO {
    email: string;
}

export interface ResetForgottenUserPasswordRequestDTO extends AccountActivationRequestDTO {
    password: string;
}
export interface ResetLoggedInUserPasswordRequestDTO {
    oldPassword: string;
    newPassword: string;
}
export interface UserDTO {
    userId: number;
    email: string;
}

export interface DetailedUserDTO extends UserDTO {
    forename: string;
    surname: string;
    organization: string;
    activated: boolean;
}

export interface DetailedUserTokenDTO extends DetailedUserDTO {
    token: string;
}
export interface EditorDTO {
    forename: string;
    surname: string;
    organization: string;
}
export interface ArtefactSide {
}
export enum Lighting {
    direct = 0,
    raking = 1
}
export enum Direction {
    left = 0,
    right = 1,
    top = 2
}
