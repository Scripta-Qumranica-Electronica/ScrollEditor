import { IIIFImage } from './image';
import { UserDTO } from '@/dtos/sqe-dtos';
import { PermissionDTO, ShareDTO, EditionDTO } from '@/dtos/sqe-dtos';

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
    public mayWrite: boolean;
    public isAdmin: boolean;

    constructor(dto: PermissionDTO) {
        this.mayWrite = dto.mayWrite;
        this.isAdmin = dto.isAdmin;
    }
}

class ShareInfo {
    public user: UserInfo;
    public permissions: Permissions;

    constructor(dto: ShareDTO) {
        this.user = new UserInfo(dto.user);
        this.permissions = new Permissions(dto.permission);
    }
}

class EditionInfo {
    public id: number;
    public name: string;
    public permission: Permissions;
    public owner: UserInfo;
    public thumbnail?: IIIFImage;
    public shares: ShareInfo[];
    public locked: boolean;
    public isPublic: boolean;
    public lastEdit?: Date;

    public publicCopies: number = 1; // Updated by the EditionService
    public otherVersions: EditionInfo[] = [];

    // public numOfArtefacts: number;
    // public numOfColumns: number;
    // public numOfFragments: number;
    // public otherVersions: EditionInfo[] = [];

    constructor(dto: EditionDTO) {
        this.id = dto.id;
        this.name = dto.name;
        this.permission = new Permissions(dto.permission); // isAdmin, mayWrite
        this.owner = new UserInfo(dto.owner);
        if (dto.thumbnailUrl) {
            this.thumbnail = new IIIFImage(dto.thumbnailUrl);
        }
        this.shares = dto.shares ? dto.shares.map((s) => new ShareInfo(s)) : [];
        this.locked = dto.locked;
        this.isPublic = dto.isPublic;
        if (dto.lastEdit) {
            this.lastEdit = new Date(Date.parse(dto.lastEdit));
        }
    }
}

interface AllEditions {
    editionList: EditionInfo[];
    myEditionList: EditionInfo[];
}

export { UserInfo, EditionInfo, ShareInfo, AllEditions };
