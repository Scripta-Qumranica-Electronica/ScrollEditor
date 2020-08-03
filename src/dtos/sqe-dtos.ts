// This file was generate automatically. DO NOT EDIT.
/* tslint:disable */
export interface ArtefactDataDTO {
    id: number;
    name: string;
}

export interface ArtefactDTO extends ArtefactDataDTO {
    editionId: number;
    imagedObjectId: string;
    imageId: number;
    artefactDataEditorId: number;
    mask: string;
    artefactMaskEditorId: number;
    isPlaced: boolean;
    placement: PlacementDTO;
    artefactPlacementEditorId?: number;
    side: string;
    statusMessage: string;
}

export interface ArtefactListDTO {
    artefacts: ArtefactDTO[];
}

export interface ArtefactDataListDTO {
    artefacts: ArtefactDataDTO[];
}

export interface ArtefactGroupDTO extends UpdateArtefactGroupDTO {
    id: number;
}

export interface ArtefactGroupListDTO {
    artefactGroups: ArtefactGroupDTO[];
}

export interface UpdateArtefactDTO {
    mask: string;
    placement: PlacementDTO;
    name: string;
    statusMessage: string;
}

export interface UpdateArtefactPlacementDTO {
    artefactId: number;
    isPlaced: boolean;
    placement: PlacementDTO;
}

export interface BatchUpdateArtefactPlacementDTO {
    artefactPlacements: UpdateArtefactPlacementDTO[];
}

export interface UpdatedArtefactPlacementDTO extends UpdateArtefactPlacementDTO {
    placementEditorId: number;
}

export interface BatchUpdatedArtefactTransformDTO {
    artefactPlacements: UpdatedArtefactPlacementDTO[];
}

export interface UpdateArtefactGroupDTO extends CreateArtefactGroupDTO {
}

export interface CreateArtefactDTO extends UpdateArtefactDTO {
    masterImageId: number;
    mask: string;
}
export interface CreateArtefactGroupDTO {
    name: string;
    artefacts: number[];
}

export interface EditionDTO {
    id: number;
    name: string;
    editionDataEditorId: number;
    permission: PermissionDTO;
    owner: UserDTO;
    thumbnailUrl: string;
    shares: DetailedEditorRightsDTO[];
    metrics: EditionManuscriptMetricsDTO;
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
    mayRead: boolean;
    mayWrite: boolean;
    isAdmin: boolean;
}

export interface UpdateEditorRightsDTO extends PermissionDTO {
    mayLock: boolean;
}

export interface InviteEditorDTO extends UpdateEditorRightsDTO {
    email: string;
}

export interface DetailedEditorRightsDTO extends UpdateEditorRightsDTO {
    email: string;
    editionId: number;
}

export interface DetailedUpdateEditorRightsDTO extends UpdateEditorRightsDTO {
    editionId: number;
    editionName: string;
    date: string;
}

export interface AdminEditorRequestDTO extends DetailedUpdateEditorRightsDTO {
    editorName: string;
    editorEmail: string;
}

export interface EditorInvitationDTO extends DetailedUpdateEditorRightsDTO {
    token: string;
    requestingAdminName: string;
    requestingAdminEmail: string;
}

export interface EditorInvitationListDTO {
    editorInvitations: EditorInvitationDTO[];
}

export interface AdminEditorRequestListDTO {
    editorRequests: AdminEditorRequestDTO[];
}

export interface TextEditionDTO {
    manuscriptId: number;
    editionName: string;
    editorId: number;
    licence: string;
    editors: { [key: string] : EditorDTO };
    textFragments: TextFragmentDTO[];
}
export interface DeleteTokenDTO {
    editionId: number;
    token: string;
}
export interface DeleteEditionEntityDTO {
    entityId: number;
    editorId: number;
}
export enum EditionEntities {
    edition = 0,
    artefact = 1,
    artefactGroup = 2,
    textFragment = 3,
    line = 4,
    signInterpretation = 5,
    roi = 6
}

export interface DeleteDTO {
    entity: EditionEntities;
    ids: number[];
}

export interface EditionUpdateRequestDTO extends EditionCopyDTO {
    metrics: UpdateEditionManuscriptMetricsDTO;
}
export interface EditionCopyDTO {
    name: string;
    copyrightHolder: string;
    collaborators: string;
}
export interface UpdateEditionManuscriptMetricsDTO {
    width: number;
    height: number;
    xOrigin: number;
    yOrigin: number;
}

export interface EditionManuscriptMetricsDTO extends UpdateEditionManuscriptMetricsDTO {
    ppi: number;
    editorId: number;
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
    ppi: number;
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
export interface WktPolygonDTO {
    wktPolygon: string;
}

export interface SetInterpretationRoiDTO {
    artefactId: number;
    signInterpretationId?: number;
    shape: string;
    translate: TranslateDTO;
    stanceRotation: number;
    exceptional: boolean;
    valuesSet: boolean;
}

export interface InterpretationRoiDTO extends SetInterpretationRoiDTO {
    interpretationRoiId: number;
    editorId: number;
}

export interface UpdatedInterpretationRoiDTO extends InterpretationRoiDTO {
    oldInterpretationRoiId: number;
}

export interface SetInterpretationRoiDTOList {
    rois: SetInterpretationRoiDTO[];
}

export interface InterpretationRoiDTOList {
    rois: InterpretationRoiDTO[];
}

export interface UpdatedInterpretationRoiDTOList {
    rois: UpdatedInterpretationRoiDTO[];
}

export interface BatchEditRoiDTO {
    createRois: InterpretationRoiDTO[];
    updateRois: UpdatedInterpretationRoiDTO[];
    deleteRois: number[];
}

export interface BatchEditRoiResponseDTO {
    createRois: InterpretationRoiDTO[];
    updateRois: UpdatedInterpretationRoiDTO[];
    deleteRois: number[];
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
    attributeValueString: string;
    editorId: number;
    value: number;
}

export interface EditionScriptCollectionDTO {
    letters: CharacterShapeDTO[];
}

export interface EditionScriptLinesDTO {
    textFragments: ScriptTextFragmentDTO[];
}
export interface CharacterShapeDTO {
    id: number;
    character: string;
    polygon: string;
    imageURL: string;
    rotation: number;
    attributes: string[];
}

export interface ScriptTextFragmentDTO {
    textFragmentName: string;
    textFragmentId: number;
    lines: ScriptLineDTO[];
}

export interface ScriptLineDTO {
    lineName: string;
    lineId: number;
    artefacts: ScriptArtefactCharactersDTO[];
}

export interface ScriptArtefactCharactersDTO {
    artefactName: string;
    artefactId: number;
    placement: PlacementDTO;
    characters: SignInterpretationDTO[];
}
export interface TextFragmentDataDTO {
    id: number;
    name: string;
    editorId: number;
}

export interface ArtefactTextFragmentMatchDTO extends TextFragmentDataDTO {
    suggested: boolean;
}
export interface ImagedObjectTextFragmentMatchDTO {
    editionId: number;
    manuscriptName: string;
    textFragmentId: number;
    textFragmentName: string;
    side: string;
}

export interface TextFragmentDataListDTO {
    textFragments: TextFragmentDataDTO[];
}

export interface ArtefactTextFragmentMatchListDTO {
    textFragments: ArtefactTextFragmentMatchDTO[];
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
    editors: { [key: string] : EditorDTO };
}
export interface UpdateTextFragmentDTO {
    name: string;
    previousTextFragmentId?: number;
    nextTextFragmentId?: number;
}

export interface CreateTextFragmentDTO extends UpdateTextFragmentDTO {
    name: string;
}

export interface PlacementDTO {
    scale: number;
    rotate: number;
    zIndex: number;
    translate: TranslateDTO;
}
export interface TranslateDTO {
    x: number;
    y: number;
}
export interface LoginRequestDTO {
    email: string;
    password: string;
}
export interface UserUpdateRequestDTO {
    password: string;
    email: string;
    organization: string;
    forename: string;
    surname: string;
}

export interface NewUserRequestDTO extends UserUpdateRequestDTO {
    email: string;
    password: string;
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
    email: string;
    forename: string;
    surname: string;
    organization: string;
}
export interface ArtefactSide {
}
export enum Direction {
    left = 0,
    right = 1,
    top = 2
}
export enum Lighting {
    direct = 0,
    raking = 1
}
