import { EditionInfo, SimplifiedPermission, Permissions, ShareInfo, UserInfo } from '@/models/edition';
import { CommHelper } from './comm-helper';
import {
    EditionListDTO,
    EditionUpdateRequestDTO,
    EditionDTO,
    EditionGroupDTO,
    InviteEditorDTO,
    PermissionDTO,
    ShareDTO,
    AdminEditorRequestListDTO
} from '@/dtos/sqe-dtos';
import { StateManager } from '@/state';
import { ApiRoutes } from '@/services/api-routes';

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
        return edition;
    }

    public async inviteEditor(editionId: number, email: string, permission: SimplifiedPermission) {
        const edition = this.stateManager.editions.find(editionId);
        if (!edition) {
            throw new Error(`Can't find non-existing edition ${editionId}`);
        }

        // TODO:
        // We need to call the server using the endpoint v1/editions/<edition-id>/add-editor-request
        // We need to supply a CreateEditorsRightDTO object for this.
        //
        // step 1: get the URL
        const url = ApiRoutes.editionRequestEditor(editionId);

        // Step 2: Fill the DTO
        // Fill the fields: mayRead, isAdmin, mayLock (same as isAdmin), mayWrite and email
        const rights = Permissions.extractPermission(permission);
        const dto = {
            email,
            ...rights
        } as InviteEditorDTO;

        // Step 3: Call the backend using CommHelper.post - the server does not return a DTO in response
        await CommHelper.post<EditionDTO>(
            url,
            dto
        );

        // Step 4: update the edition to include the new invitation - if there is already an
        // invitation for this editor, overwrite it instead of adding the same one.
        const invitationIdx = edition.invitations.findIndex(i => i.user.email === email);
        const permissionsDTO = new Permissions({ mayWrite: rights.mayWrite, isAdmin: rights.isAdmin } as PermissionDTO);
        if (invitationIdx > -1) {
            edition.invitations[invitationIdx].permissions = new Permissions(permissionsDTO);

            // If update to none (revoke) => remove from rows
            if (permission === 'none') {
                edition.invitations =
                    [...edition.invitations.slice(0, invitationIdx), ...edition.invitations.slice(invitationIdx + 1)];
            }
        } else {
            const newInvitation = new ShareInfo({
                user: new UserInfo({ email, userId: 0 }),
                permission: new Permissions(permissionsDTO)
            } as ShareDTO);
            edition.invitations = [...edition.invitations, newInvitation];
        }

    }
    public async updateInvitation(editionId: number, email: string, permission: SimplifiedPermission) {
        await this.inviteEditor(editionId, email, permission);
    }
    public async confirmAddEditionEditor(token: string) {
        await CommHelper.post<any>(ApiRoutes.confirmAddEditionEditorUrl(token), null);
    }

    public async getAllInvitations(): Promise<AdminEditorRequestListDTO> {
        const response = await CommHelper.post<AdminEditorRequestListDTO>(ApiRoutes.listInvitationEditionUrl());
        return response.data;
    }

}

export default EditionService;
