import { IIIFImage } from './image';
import { UserDTO, UpdateEditorRightsDTO, DetailedEditorRightsDTO } from '@/dtos/sqe-dtos';
import { PermissionDTO, EditionDTO } from '@/dtos/sqe-dtos';
import { TextFragmentData } from './text';

type SimplifiedPermission = 'none' | 'read' | 'write' | 'admin';

class UserInfo { // TODO: add fields like UserDTO ?
    public email: string;
    public userId: number;
    public forename: string;


    constructor(dto: UserDTO) {
        this.email = dto.email;
        this.userId = dto.userId;
        this.forename = ''; // TODO - do we even need this? dto.forename;
    }
}

class Permissions {
    public static extractPermission(simplified: SimplifiedPermission): UpdateEditorRightsDTO {
        const rights: UpdateEditorRightsDTO = {
            mayRead: false,
            mayWrite: false,
            isAdmin: false,
            mayLock: false
        };

        switch (simplified) {
            case 'admin':
                rights.mayLock = rights.isAdmin = true;
            case 'write':
                rights.mayWrite = true;
            case 'read':
                rights.mayRead = true;
        }

        return rights;
    }

    public mayWrite: boolean;
    public isAdmin: boolean;
    public mayRead: boolean;

    constructor(dto: PermissionDTO) {
        this.mayWrite = dto.mayWrite;
        this.isAdmin = dto.isAdmin;
        this.mayRead = dto.mayRead;
    }

    public get readOnly() {
        return !this.mayWrite;
    }

    public get simplified(): SimplifiedPermission {
        if (this.isAdmin) {
            return 'admin';
        }
        if (this.mayWrite) {
            return 'write';
        }
        if (this.mayRead) {
            return 'read';
        }
        return 'none';
    }

}

class ShareInfo {
    public static fromDTO(dto: DetailedEditorRightsDTO) {
        return new ShareInfo(dto.email, new Permissions(dto));
    }

    public email: string;
    public permissions: Permissions;


    public constructor(email: string, permissions: Permissions) {
        this.email = email;
        this.permissions = permissions;
    }

    public get simplified(): SimplifiedPermission {
        return this.permissions.simplified;
    }
}

class EditionInfo {
    public id: number;
    public name: string;
    public permission: Permissions;
    public owner: UserInfo;
    public thumbnail?: IIIFImage;
    public shares: ShareInfo[];
    public invitations: ShareInfo[];
    public locked: boolean;
    public isPublic: boolean;
    public lastEdit?: Date;
    public groupsArtefacts: GroupArtefacts[];

    // The following properties are updated by the EditionService upon creation
    public publicCopies: number = 1;
    public mine: boolean = false;
    public otherVersions: EditionInfo[] = [];

    // The following are loaded when necessary
    public textFragments: TextFragmentData[] = [];

    constructor(dto: EditionDTO) {
        this.id = dto.id;
        this.name = dto.name;
        this.permission = new Permissions(dto.permission); // isAdmin, mayWrite
        this.owner = new UserInfo(dto.owner);
        if (dto.thumbnailUrl) {
            this.thumbnail = new IIIFImage(dto.thumbnailUrl);
        }
        this.shares = dto.shares ? dto.shares.map((s) => ShareInfo.fromDTO(s)) : [];
        this.invitations = []; // dto.invitations ? dto.shares.map((s) => new ShareInfo(s))
        this.locked = dto.locked;
        this.isPublic = dto.isPublic;
        this.groupsArtefacts = [];
        if (dto.lastEdit) {
            this.lastEdit = new Date(Date.parse(dto.lastEdit));
        }
    }
}
class GroupArtefacts {
    public id: number = 0;
    public ids: number[] = [];

    constructor(artefactsIds: number[]) {
        this.id = Math.floor(Math.random() * 10);
        this.ids.push(...artefactsIds);
    }
}

export { Permissions, SimplifiedPermission, UserInfo, EditionInfo, ShareInfo, GroupArtefacts };
