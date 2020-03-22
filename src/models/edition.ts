import { IIIFImage } from './image';
import { UserDTO, UpdateEditorRightsDTO } from '@/dtos/sqe-dtos';
import { PermissionDTO, ShareDTO, EditionDTO } from '@/dtos/sqe-dtos';
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

    constructor(dto: PermissionDTO) {
        this.mayWrite = dto.mayWrite;
        this.isAdmin = dto.isAdmin;
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
        return 'read';
    }

}

class ShareInfo {
    public user: UserInfo;
    public permissions: Permissions;

    constructor(dto: ShareDTO) {
        this.user = new UserInfo(dto.user);
        this.permissions = new Permissions(dto.permission);
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
        this.shares = dto.shares ? dto.shares.map((s) => new ShareInfo(s)) : [ new ShareInfo({user : {email: 'Shaindel@gmail.com', userId: 3}, permission: {mayWrite: false, isAdmin: true}}),
        new ShareInfo({user : {email: 'totosoRead@gmail.com', userId: 4}, permission: {mayWrite: false, isAdmin: false}}),
        new ShareInfo({user : {email: 'totosoWrite@gmail.com', userId: 5}, permission: {mayWrite: true, isAdmin: false}})];
        this.invitations = []; // dto.invitations ? dto.shares.map((s) => new ShareInfo(s))
        this.locked = dto.locked;
        this.isPublic = dto.isPublic;
        if (dto.lastEdit) {
            this.lastEdit = new Date(Date.parse(dto.lastEdit));
        }
    }
}

export { Permissions, SimplifiedPermission, UserInfo, EditionInfo, ShareInfo };
