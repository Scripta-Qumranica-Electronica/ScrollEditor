import { IIIFImage } from './image';
import { UserDTO } from '@/dtos/user';
import { PermissionDTO, ShareDTO, EditionDTO } from '@/dtos/editions';

class UserInfo {
    public userName: string;
    public userId: number;

    constructor(dto: UserDTO) {
        this.userName = dto.userName;
        this.userId = dto.userId;
    }
}

class Permissions {
    public canWrite: boolean;
    public canAdmin: boolean;

    constructor(dto: PermissionDTO) {
        this.canWrite = dto.canWrite;
        this.canAdmin = dto.canAdmin;
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
        this.permission = new Permissions(dto.permission); // isAdmin, canWrite
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

export { EditionInfo, ShareInfo, AllEditions };
