/* tslint:disable */

/*
 * Do not edit this file directly!
 * This set of interfaces and enums is autogenerated by `GenerateTypescriptDTOs` 
 * in the project https://github.com/Scripta-Qumranica-Electronica/SQE_API.
 * Changes made there are used to automatically create this file at {ROOT}/ts-dtos
 * whenever the GenerateTypescriptDTOs program is run.
 */


export interface EditionScriptCollectionDTO {
    letters: Array<CharacterShapeDTO>;
}

export interface EditionScriptLinesDTO {
    textFragments: Array<ScriptTextFragmentDTO>;
}

export interface CharacterShapeDTO {
    id: number;
    character: string;
    polygon: string;
    imageURL: string;
    rotation: number;
    attributes: Array<string>;
}

export interface ScriptTextFragmentDTO {
    textFragmentName: string;
    textFragmentId: number;
    lines: Array<ScriptLineDTO>;
}

export interface ScriptLineDTO {
    lineName: string;
    lineId: number;
    artefacts: Array<ScriptArtefactCharactersDTO>;
}

export interface ScriptArtefactCharactersDTO {
    artefactName: string;
    artefactId: number;
    placement: PlacementDTO;
    characters: Array<SignInterpretationDTO>;
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
    side: SideDesignation;
}

export interface ImagedObjectTextFragmentMatchListDTO {
    matches?: Array<ImagedObjectTextFragmentMatchDTO>;
}

export interface TextFragmentDataListDTO {
    textFragments: Array<TextFragmentDataDTO>;
}

export interface ArtefactTextFragmentMatchListDTO {
    textFragments: Array<ArtefactTextFragmentMatchDTO>;
}

export interface TextFragmentDTO {
    textFragmentId: number;
    textFragmentName: string;
    editorId: number;
    lines: Array<LineDTO>;
}

export interface LineDataDTO {
    lineId: number;
    lineName: string;
}

export interface LineDataListDTO {
    lines: Array<LineDataDTO>;
}

export interface LineDTO {
    lineId: number;
    lineName: string;
    editorId: number;
    signs: Array<SignDTO>;
}

export interface LineTextDTO extends LineDTO {
    licence: string;
    editors: { [key: string] : EditorDTO };
}

export interface UpdateTextFragmentDTO {
    name?: string;
    previousTextFragmentId?: number;
    nextTextFragmentId?: number;
}

export interface CreateTextFragmentDTO extends UpdateTextFragmentDTO {
    name: string;
}

export interface RequestMaterializationDTO {
    editionIds: Array<number>;
}

export interface SignDTO {
    signInterpretations: Array<SignInterpretationDTO>;
}

export interface NextSignInterpretationDTO {
    nextSignInterpretationId: number;
    creatorId: number;
    editorId: number;
}

export interface SignInterpretationBaseDTO {
    character?: string;
    isVariant: boolean;
}

export interface SignInterpretationCreateDTO extends SignInterpretationBaseDTO {
    lineId?: number;
    previousSignInterpretationIds?: Array<number>;
    nextSignInterpretationIds?: Array<number>;
    attributes: Array<InterpretationAttributeCreateDTO>;
    rois: Array<SetInterpretationRoiDTO>;
    commentary?: CommentaryCreateDTO;
    breakPreviousAndNextSignInterpretations: boolean;
}

export interface SignInterpretationVariantDTO extends InterpretationAttributeBaseDTO {
    character: string;
}

export interface SignInterpretationCharacterUpdateDTO {
    character?: string;
    attributeValueId?: number;
    priority: number;
}

export interface SignInterpretationDTO extends SignInterpretationBaseDTO {
    signId: number;
    signInterpretationId: number;
    nextSignInterpretations: Array<NextSignInterpretationDTO>;
    attributes: Array<InterpretationAttributeDTO>;
    rois: Array<InterpretationRoiDTO>;
    commentary?: CommentaryDTO;
}

export interface SignInterpretationListDTO {
    signInterpretations?: Array<SignInterpretationDTO>;
}

export interface SignInterpretationCreatedDTO {
    created?: Array<SignInterpretationDTO>;
    updated?: Array<SignInterpretationDTO>;
}

export interface SignInterpretationDeleteDTO {
    updates?: SignInterpretationListDTO;
    deletes?: Array<number>;
}

export interface InterpretationAttributeBaseDTO {
    sequence?: number;
    attributeId: number;
    attributeValueId: number;
}

export interface InterpretationAttributeCreateDTO extends InterpretationAttributeBaseDTO {
    commentary?: string;
}

export interface InterpretationAttributeDTO extends InterpretationAttributeBaseDTO {
    interpretationAttributeId: number;
    attributeString: string;
    attributeValueString: string;
    creatorId: number;
    editorId: number;
    commentary?: CommentaryDTO;
}

export interface CreateAttributeValueDTO {
    value: string;
    description?: string;
    cssDirectives?: string;
}

export interface UpdateAttributeValueDTO extends CreateAttributeValueDTO {
    id: number;
}

export interface AttributeValueDTO extends UpdateAttributeValueDTO {
    creatorId: number;
    editorId: number;
}

export interface AttributeBaseDTO {
    description?: string;
    editable: boolean;
    removable: boolean;
    repeatable: boolean;
    batchEditable: boolean;
}

export interface CreateAttributeDTO extends AttributeBaseDTO {
    attributeName: string;
    values: Array<CreateAttributeValueDTO>;
}

export interface UpdateAttributeDTO {
    createValues: Array<CreateAttributeValueDTO>;
    updateValues: Array<UpdateAttributeValueDTO>;
    deleteValues: Array<number>;
    editable: boolean;
    removable: boolean;
    repeatable: boolean;
    batchEditable: boolean;
}

export interface AttributeDTO extends AttributeBaseDTO {
    attributeId: number;
    attributeName: string;
    values: Array<AttributeValueDTO>;
    creatorId: number;
    editorId: number;
}

export interface AttributeListDTO {
    attributes: Array<AttributeDTO>;
}

export interface PlacementDTO {
    scale: number;
    rotate: number;
    zIndex: number;
    translate?: TranslateDTO;
    mirrored: boolean;
}

export interface TranslateDTO {
    x: number;
    y: number;
}

export interface SimpleImageDTO {
    id: number;
    url: string;
    lightingType: Lighting;
    lightingDirection: Direction;
    waveLength: Array<string>;
    type: string;
    side: SideDesignation;
    ppi: number;
    master: boolean;
    catalogNumber: number;
}

export interface ImageDTO extends SimpleImageDTO {
    imageToImageMapEditorId?: number;
    regionInMasterImage?: string;
    regionInImage?: string;
    transformToMaster?: string;
}

export interface SimpleImageListDTO {
    images: Array<SimpleImageDTO>;
}

export interface ImageInstitutionDTO {
    name: string;
}

export interface ImageInstitutionListDTO {
    institutions: Array<ImageInstitutionDTO>;
}

export interface InstitutionalImageDTO {
    id: string;
    thumbnailUrl: string;
    license: string;
}

export interface InstitutionalImageListDTO {
    institutionalImages: Array<InstitutionalImageDTO>;
}

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
    side: SideDesignation;
    statusMessage?: string;
}

export interface ArtefactListDTO {
    artefacts: Array<ArtefactDTO>;
}

export interface ArtefactDataListDTO {
    artefacts: Array<ArtefactDataDTO>;
}

export interface ArtefactGroupDTO extends CreateArtefactGroupDTO {
    id: number;
}

export interface ArtefactGroupListDTO {
    artefactGroups: Array<ArtefactGroupDTO>;
}

export interface UpdateArtefactDTO {
    mask?: string;
    placement?: PlacementDTO;
    name?: string;
    statusMessage?: string;
}

export interface UpdateArtefactPlacementDTO {
    artefactId: number;
    isPlaced: boolean;
    placement?: PlacementDTO;
}

export interface BatchUpdateArtefactPlacementDTO {
    artefactPlacements: Array<UpdateArtefactPlacementDTO>;
}

export interface UpdatedArtefactPlacementDTO extends UpdateArtefactPlacementDTO {
    placementEditorId: number;
}

export interface BatchUpdatedArtefactTransformDTO {
    artefactPlacements: Array<UpdatedArtefactPlacementDTO>;
}

export interface CreateArtefactDTO extends UpdateArtefactDTO {
    masterImageId: number;
}

export interface UpdateArtefactGroupDTO {
    name?: string;
    artefacts: Array<number>;
}

export interface CreateArtefactGroupDTO extends UpdateArtefactGroupDTO {
    name: string;
}

export interface EditionDTO {
    id: number;
    name: string;
    editionDataEditorId: number;
    permission: PermissionDTO;
    owner: UserDTO;
    thumbnailUrl?: string;
    shares: Array<DetailedEditorRightsDTO>;
    metrics: EditionManuscriptMetricsDTO;
    locked: boolean;
    isPublic: boolean;
    lastEdit?: string;
    copyright: string;
}

export interface EditionGroupDTO {
    primary: EditionDTO;
    others: Array<EditionDTO>;
}

export interface EditionListDTO {
    editions: Array<Array<EditionDTO>>;
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
    editorName?: string;
    editorEmail: string;
}

export interface EditorInvitationDTO extends DetailedUpdateEditorRightsDTO {
    token: string;
    requestingAdminName: string;
    requestingAdminEmail: string;
}

export interface EditorInvitationListDTO {
    editorInvitations: Array<EditorInvitationDTO>;
}

export interface AdminEditorRequestListDTO {
    editorRequests: Array<AdminEditorRequestDTO>;
}

export interface TextEditionDTO {
    manuscriptId: number;
    editionName: string;
    editorId: number;
    licence: string;
    editors: { [key: string] : EditorDTO };
    textFragments: Array<TextFragmentDTO>;
}

export interface DeleteTokenDTO {
    editionId: number;
    token: string;
}

export interface CommentaryCreateDTO {
    commentary?: string;
}

export interface CommentaryDTO extends CommentaryCreateDTO {
    creatorId: number;
    editorId: number;
}

export interface DeleteDTO {
    entity: EditionEntities;
    ids: Array<number>;
}

export interface EditionUpdateRequestDTO extends EditionCopyDTO {
    metrics?: UpdateEditionManuscriptMetricsDTO;
}

export interface EditionCopyDTO {
    name?: string;
    copyrightHolder?: string;
    collaborators?: string;
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

export interface LoginRequestDTO {
    email: string;
    password: string;
}

export interface UserUpdateRequestDTO {
    password: string;
    email?: string;
    organization?: string;
    forename?: string;
    surname?: string;
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
    forename?: string;
    surname?: string;
    organization?: string;
    activated: boolean;
}

export interface DetailedUserTokenDTO extends DetailedUserDTO {
    token: string;
}

export interface EditorDTO {
    email: string;
    forename?: string;
    surname?: string;
    organization?: string;
}

export interface UserDataStoreDTO {
    data: string;
}

export interface ImageStackDTO {
    id?: number;
    images: Array<ImageDTO>;
    masterIndex?: number;
}

export interface ImagedObjectDTO {
    id: string;
    recto: ImageStackDTO;
    verso: ImageStackDTO;
    artefacts: Array<ArtefactDTO>;
}

export interface ImagedObjectListDTO {
    imagedObjects: Array<ImagedObjectDTO>;
}

export interface WktPolygonDTO {
    wktPolygon: string;
}

export interface DetailedSearchRequestDTO {
    textDesignation?: string;
    imageDesignation?: string;
    textReference?: Array<string>;
    artefactDesignation?: Array<string>;
}

export interface DetailedSearchResponseDTO {
    editions?: EditionListDTO;
    textFragments?: TextFragmentDataListDTO;
    artefacts?: ArtefactDataListDTO;
    images?: ImagedObjectListDTO;
}

export interface SetInterpretationRoiDTO {
    artefactId: number;
    signInterpretationId: number;
    shape: string;
    translate: TranslateDTO;
    stanceRotation: number;
    exceptional: boolean;
    valuesSet: boolean;
}

export interface UpdateInterpretationRoiDTO extends SetInterpretationRoiDTO {
    interpretationRoiId: number;
}

export interface InterpretationRoiDTO extends UpdateInterpretationRoiDTO {
    creatorId: number;
    editorId: number;
}

export interface UpdatedInterpretationRoiDTO extends InterpretationRoiDTO {
    oldInterpretationRoiId: number;
}

export interface SetInterpretationRoiDTOList {
    rois: Array<SetInterpretationRoiDTO>;
}

export interface InterpretationRoiDTOList {
    rois: Array<InterpretationRoiDTO>;
}

export interface UpdateInterpretationRoiDTOList {
    rois: Array<UpdateInterpretationRoiDTO>;
}

export interface UpdatedInterpretationRoiDTOList {
    rois: Array<UpdatedInterpretationRoiDTO>;
}

export interface BatchEditRoiDTO {
    createRois?: Array<SetInterpretationRoiDTO>;
    updateRois?: Array<UpdateInterpretationRoiDTO>;
    deleteRois?: Array<number>;
}

export interface BatchEditRoiResponseDTO {
    createRois: Array<InterpretationRoiDTO>;
    updateRois: Array<UpdatedInterpretationRoiDTO>;
    deleteRois: Array<number>;
}

export interface CatalogueMatchInputDTO {
    catalogSide?: SideDesignation;
    imagedObjectId: string;
    manuscriptId: number;
    manuscriptName: string;
    editionName: string;
    editionVolume: string;
    editionLocation1: string;
    editionLocation2: string;
    editionSide: SideDesignation;
    comment?: string;
    textFragmentId: number;
    editionId: number;
    confirmed?: boolean;
}

export interface CatalogueMatchDTO extends CatalogueMatchInputDTO {
    imageCatalogId: number;
    institution: string;
    catalogueNumber1: string;
    catalogueNumber2?: string;
    proxy?: string;
    url: string;
    filename: string;
    suffix: string;
    thumbnail: string;
    license: string;
    iaaEditionCatalogueId: number;
    name: string;
    matchAuthor: string;
    matchConfirmationAuthor?: string;
    matchId: number;
    dateOfMatch: string;
    dateOfConfirmation?: string;
}

export interface CatalogueMatchListDTO {
    matches: Array<CatalogueMatchDTO>;
}

export type Direction = 
    'left' |
    'right' |
    'top'
;

export type Lighting = 
    'direct' |
    'raking'
;

export type EditionEntities = 
    'edition' |
    'artefact' |
    'artefactGroup' |
    'attribute' |
    'textFragment' |
    'line' |
    'signInterpretation' |
    'roi'
;

export type SideDesignation = 
    'recto' |
    'verso'
;
