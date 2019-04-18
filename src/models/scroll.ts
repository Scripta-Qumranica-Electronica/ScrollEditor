import { IIIFImage } from './image';

class ScrollInfo {
    public name: string;
    public thumbnails: IIIFImage[];
    public scrollVersionIds: number[];
    public defaultScrollVersionId: number;
    public numImageFragments: number;

    constructor(serverObj: any) {
        this.name = serverObj.name;

        this.thumbnails = [new IIIFImage(serverObj.thumbnailUrl)];

        this.scrollVersionIds = JSON.parse(serverObj.scroll_version_ids);
        this.defaultScrollVersionId = serverObj.scroll_version_id;
        this.numImageFragments = serverObj.image_fragments;
    }
}

class UserInfo {
    public userName: string;
    public userId: number;

    constructor(serverObj: any) {
        this.userName = serverObj.userName;
        this.userId = serverObj.userId;
    }
}

class Permissions {
    public canWrite: boolean;
    public canAdmin: boolean;

    constructor(serverObj: any) {
        this.canWrite = serverObj.canWrite || false;
        this.canAdmin = serverObj.canAdmin || false;
    }
}

class ShareInfo {
    public user: UserInfo;
    public permissions: Permissions;

    constructor(serverObj: any) {
        this.user = new UserInfo(serverObj);
        this.permissions = new Permissions(serverObj);
    }
}

class ScrollVersionInfo {
    public id: number;
    public name: string;
    public permission: Permissions;
    public owner: UserInfo;
    public thumbnailUrl: IIIFImage[];
    public shares: ShareInfo[];
    public locked: boolean;
    public isPublic: boolean;
    public lastEdit: Date | null;
    public publicCopies: number; // Updated by the ScrollService
    public otherVersions: ScrollVersionInfo[];

    // public numOfArtefacts: number;
    // public numOfColumns: number;
    // public numOfFragments: number;
    // public otherVersions: ScrollVersionInfo[] = [];

    constructor(serverObj: any) {
        this.id = serverObj.id;
        this.name = serverObj.name;
        this.permission = new Permissions(serverObj.permission); // isAdmin, canWrite
        this.owner = new UserInfo(serverObj.owner);
        this.thumbnailUrl = serverObj.thumbnailUrl !== null ? [new IIIFImage(serverObj.thumbnailUrl)] : [];
        const sharedObj: any[] = JSON.parse(serverObj.shared || '[]');
        this.shares = sharedObj.map((obj) => new ShareInfo(obj));
        this.locked = serverObj.locked || false;
        this.isPublic = serverObj.isPublic || false;
        this.lastEdit = serverObj.lastEdit ? new Date(Date.parse(serverObj.lastEdit)) : null;
        this.publicCopies = serverObj.publicCopies || 0;
        this.otherVersions = serverObj.otherVersions || [];
    }
}

interface AllScrollVersion {
    scrollList: ScrollVersionInfo[] | [];
    myScrollList: ScrollVersionInfo[] | [];
}

export { ScrollInfo, ScrollVersionInfo, ShareInfo, AllScrollVersion };
