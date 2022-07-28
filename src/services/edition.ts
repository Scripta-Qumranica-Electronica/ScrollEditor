import {
    EditionInfo,
    SimplifiedPermission,
    Permissions,
    ShareInfo,
    ArtefactGroup
} from '@/models/edition';
import { CommHelper } from './comm-helper';
import {
    EditionListDTO,
    EditionGroupDTO,
    EditionUpdateRequestDTO,
    EditionDTO,
    InviteEditorDTO,
    PermissionDTO,
    AdminEditorRequestListDTO,
    DetailedEditorRightsDTO,
    UpdateArtefactPlacementDTO,
    BatchUpdateArtefactPlacementDTO,
    UpdateArtefactGroupDTO,
    CreateArtefactGroupDTO,
    ArtefactGroupDTO,
    ArtefactGroupListDTO,
    UpdateEditionManuscriptMetricsDTO,
    AttributeListDTO,
    ScriptDataDTO,
    ScriptDataListDTO,
    PlacementDTO,
    EditionManuscriptMetadataDTO
} from '@/dtos/sqe-dtos';
import { StateManager } from '@/state';
import { ApiRoutes } from '@/services/api-routes';
import { Artefact } from '@/models/artefact';

class EditionService {
    public stateManager: StateManager;

    constructor() {
        this.stateManager = StateManager.instance;
    }

    public async getAllEditions(): Promise<EditionInfo[]> {
        const response = await CommHelper.get<EditionListDTO>(
            ApiRoutes.allEditionsUrl()
        );
        let editionList = [] as EditionInfo[];

        response.data.editions.map(grp => {
            // grp is a group of editions - all versions of each other
            const editions = grp.map(obj => new EditionInfo(obj));

            // Set various edition flags that depend on other editions
            const publicCopies = editions.filter(ed => ed.isPublic).length;
            for (const edition of editions) {
                if (this.stateManager.session.user) {
                    edition.mine =
                        edition.owner.userId ===
                        this.stateManager.session.user.userId;
                } else {
                    edition.mine = false;
                }
                edition.otherVersions = editions.filter(ed => ed !== edition);
                edition.publicCopies = publicCopies;
            }

            editionList = editionList.concat(editions);
        });

        return editionList;
    }

    public async getSingleEditions(
        editionId: number
    ): Promise<EditionGroupDTO> {
        const response = await CommHelper.get<EditionGroupDTO>(
            ApiRoutes.editionUrl(editionId)
        );

        return response.data;
    }

    public async getManuscriptEditions(
        manuscriptId: number
    ): Promise<EditionListDTO> {
        const response = await CommHelper.get<EditionListDTO>(
            ApiRoutes.manuscriptEditions(manuscriptId)
        );

        return response.data;
    }

    public async getEditionMetadata(
        editionId: number
    ): Promise<EditionManuscriptMetadataDTO> {
        const response = await CommHelper.get<EditionManuscriptMetadataDTO>(
            ApiRoutes.editionMetadataUrl(editionId)
        );

        return response.data;
    }

    public async copyEdition(
        editionId: number,
        name: string
    ): Promise<EditionInfo> {
        const prevEdition = this.stateManager.editions.find(editionId);

        if (!prevEdition) {
            throw new Error(`Can't copy non existing edition ${editionId}`);
        }

        const dto = {
            name
            // collaborators: '',
            // copyrightHolder: this.stateManager.session.user!.forename + ' ' + this.stateManager.session.user!.surname
        } as EditionUpdateRequestDTO;
        const response = await CommHelper.post<EditionDTO>(
            ApiRoutes.editionUrl(editionId),
            dto
        );

        const newEdition = new EditionInfo(response.data);

        // Connect the new edition to other editions of its group
        newEdition.mine = true; // Cloned editions are always mine
        newEdition.otherVersions = [...prevEdition.otherVersions, prevEdition]; // Set new's other versions

        // Update otherVersions of all the previous versions
        for (const other of newEdition.otherVersions) {
            other.otherVersions.push(newEdition);
        }

        // Now update the state's edition collection
        const current = this.stateManager.editions.current;
        const allEditions = [...this.stateManager.editions.items, newEdition];
        this.stateManager.editions.items = allEditions;
        this.stateManager.editions.current = current;

        return newEdition;
    }

    public async renameEdition(
        editionId: number,
        name: string
    ): Promise<EditionInfo> {
        const edition = this.stateManager.editions.find(editionId);
        if (!edition) {
            throw new Error(`Can't find non-existing edition ${editionId}`);
        }

        const dto = {
            name
        } as EditionUpdateRequestDTO;
        const response = await CommHelper.put<EditionDTO>(
            ApiRoutes.editionUrl(editionId),
            dto
        );

        edition.name = response.data.name;
        edition.updateLastEdit(response.data.lastEdit);

        return edition;
    }

    public async deleteEdition(
        editionId: number,
        isAdmin?: boolean
    ): Promise<string | undefined> {
        // If you are not an admin for the edition, DELETE /v1/editions/xxxx
        if (!isAdmin) {
            return (await CommHelper.delete(ApiRoutes.editionUrl(editionId)))
                .data;
        } else {
            const token = (
                await CommHelper.delete(ApiRoutes.editionUrl(editionId, true))
            ).data.token;
            return (
                await CommHelper.delete(
                    ApiRoutes.editionUrl(editionId, true, token)
                )
            ).data;
        }
    }

    public async inviteEditor(
        editionId: number,
        email: string,
        permission: SimplifiedPermission
    ) {
        const edition = this.stateManager.editions.find(editionId);
        if (!edition) {
            throw new Error(`Can't find non-existing edition ${editionId}`);
        }

        const url = ApiRoutes.editionRequestEditor(editionId);

        const rights = Permissions.extractPermission(permission);
        const dto = {
            email,
            ...rights
        } as InviteEditorDTO;

        await CommHelper.post<EditionDTO>(url, dto);

        const invitationIdx = edition.invitations.findIndex(
            i => i.email === email
        );
        const permissionsDTO = new Permissions({
            mayWrite: rights.mayWrite,
            isAdmin: rights.isAdmin,
            mayRead: rights.mayRead
        } as PermissionDTO);
        if (invitationIdx > -1) {
            edition.invitations[invitationIdx].permissions = new Permissions(
                permissionsDTO
            );

            // If update to none (revoke) => remove from rows
            if (permission === 'none') {
                edition.invitations = [
                    ...edition.invitations.slice(0, invitationIdx),
                    ...edition.invitations.slice(invitationIdx + 1)
                ];
            }
        } else {
            const newInvitation = new ShareInfo(
                email,
                new Permissions(permissionsDTO)
            );
            edition.invitations = [...edition.invitations, newInvitation];
        }
    }

    public async updateInvitation(
        editionId: number,
        email: string,
        permission: SimplifiedPermission
    ) {
        await this.inviteEditor(editionId, email, permission);
    }

    public async confirmAddEditionEditor(token: string) {
        await CommHelper.post<any>(
            ApiRoutes.confirmAddEditionEditorUrl(token),
            null
        );
    }

    public async updateSharePermissions(
        editionId: number,
        email: string,
        permission: SimplifiedPermission
    ) {
        const edition = this.stateManager.editions.find(editionId);
        if (!edition) {
            throw new Error(`Can't find non-existing edition ${editionId}`);
        }
        const share = edition.shares.find(sh => sh.email === email);
        if (!share) {
            throw new Error(
                `Can't find share for user ${email} in edition ${editionId}`
            );
        }

        const url = ApiRoutes.editionUpdateEditor(editionId, email);

        const dto = Permissions.extractPermission(permission);

        const response = await CommHelper.put<DetailedEditorRightsDTO>(
            url,
            dto
        );

        share.permissions = new Permissions(response.data);
        edition.shares = [...edition.shares];
    }

    public async getAllInvitations(): Promise<AdminEditorRequestListDTO> {
        const response = await CommHelper.get<AdminEditorRequestListDTO>(
            ApiRoutes.listInvitationEditionUrl()
        );
        return response.data;
    }

    public async updateArtefactDTOs(
        editionId: number,
        updateArtefacts: Artefact[]
    ): Promise<BatchUpdateArtefactPlacementDTO> {
        // TODO: Fill BatchUpdateArtefactTransformDTO and access server
        const edition = this.stateManager.editions.find(editionId);
        if (!edition) {
            throw new Error(`Can't find non-existing edition ${editionId}`);
        }

        const artefactPlacements: UpdateArtefactPlacementDTO[] = updateArtefacts.map(
            (x: Artefact) => ({
                artefactId: x.id,
                placement: x.placement as PlacementDTO,
                isPlaced: x.isPlaced
            })
        );

        // Fill dto with data
        const dto = {
            artefactPlacements
        } as BatchUpdateArtefactPlacementDTO;

        const response = await CommHelper.post<BatchUpdateArtefactPlacementDTO>(
            ApiRoutes.batchUpdateArtefactDTOs(editionId),
            dto
        );

        this.stateManager.touchEdition(editionId);
        return response.data;
    }

    public async newArtefactGroup(
        editionId: number,
        artefactsGroup: ArtefactGroup
    ) {
        const dto: CreateArtefactGroupDTO = {
            name: artefactsGroup.groupId.toString() /*check ?*/,
            artefacts: artefactsGroup.artefactIds
        };

        const response = await CommHelper.post<ArtefactGroupDTO>(
            ApiRoutes.artefactGroupUrl(editionId),
            dto
        );
        this.stateManager.touchEdition(editionId);

        return response.data;
    }

    public async updateArtefactGroup(
        editionId: number,
        artefactsGroup: ArtefactGroup
    ) {
        const dto: UpdateArtefactGroupDTO = {
            name: artefactsGroup.groupId.toString(),
            artefacts: artefactsGroup.artefactIds
        };

        const response = await CommHelper.put<UpdateArtefactGroupDTO>(
            ApiRoutes.artefactGroupUrl(editionId, artefactsGroup.groupId),
            dto
        );

        this.stateManager.touchEdition(editionId);
        return response.data;
    }

    public async deleteArtefactGroup(editionId: number, groupId: number) {
        await CommHelper.delete(ApiRoutes.artefactGroupUrl(editionId, groupId));
    }

    public async getArtefactGroups(
        editionId: number
    ): Promise<ArtefactGroup[]> {
        const response = await CommHelper.get<ArtefactGroupListDTO>(
            ApiRoutes.artefactGroupUrl(editionId)
        );

        return response.data.artefactGroups.map(
            artGroupDto => new ArtefactGroup(artGroupDto)
        );
    }

    public async updateMetrics(
        editionId: number,
        metrics: UpdateEditionManuscriptMetricsDTO
    ) {
        const edition = this.stateManager.editions.find(editionId);
        if (!edition) {
            throw new Error(`Can't find non-existing edition ${editionId}`);
        }

        const dto = {
            name: edition.name,
            metrics
        } as EditionUpdateRequestDTO;
        const response = await CommHelper.put<EditionDTO>(
            ApiRoutes.editionUrl(editionId),
            dto
        );

        edition.metrics = response.data.metrics;
        edition.updateLastEdit(response.data.lastEdit);
        return edition;
    }

    public async getAllAttributeMetadata(
        editionId: number
    ): Promise<AttributeListDTO> {
        const response = await CommHelper.get<AttributeListDTO>(
            ApiRoutes.editionAttributeMetadataUrl(editionId)
        );

        return response.data;
    }

    public async getScribalFont(editionId: number): Promise<ScriptDataListDTO> {
        const url = ApiRoutes.editionScirbalFontUrl(editionId);
        const response = await CommHelper.get<ScriptDataListDTO>(url);

        return response.data;
    }
}

export default EditionService;
