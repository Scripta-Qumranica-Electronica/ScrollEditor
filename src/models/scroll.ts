import Combination from './combination';

class ScrollInfo {
    public name: string;
    public thumbnailUrls: string[];
    public scrollVersionIds: number[];
    public defaultScrollVersionId: number;
    public numImageFragments: number;

    constructor(serverObj: any) {
        this.name = serverObj.name;
        this.thumbnailUrls = JSON.parse(serverObj.thumbnails) || [];
        this.scrollVersionIds = JSON.parse(serverObj.scroll_version_ids);
        this.defaultScrollVersionId = serverObj.scroll_version_id;
        this.numImageFragments = serverObj.image_fragments;
    }
}

class UserInfo {
    public userName: string;
    public userId: number;

    constructor(serverObj: any) {
        this.userName = serverObj.name;
        this.userId = serverObj.id;
    }
}

class Permissions {
    public canWrite: boolean;
    public canLock: boolean;

    constructor(serverObj: any) {
        this.canWrite = serverObj.can_write === 1;
        this.canLock = serverObj.can_lock === 1;
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
    public name: string;
    public versionId: number;
    public owner: UserInfo;
    public permissions: Permissions;
    public thumbnailUrls: string[];

    public shares: ShareInfo[];

    public numOfArtefacts: number;
    public numOfColsFrags: number;

    public locked: boolean;
    public lastEdit: Date | null;

    constructor(serverObj: any) {
        this.name = serverObj.name;
        this.versionId = serverObj.scroll_version_id;
        this.owner = new UserInfo(JSON.parse(serverObj.owner));
        this.permissions = new Permissions(serverObj);
        this.thumbnailUrls = JSON.parse(serverObj.thumbnails || '[]');

        const sharedObj: any[] = JSON.parse(serverObj.shared || '[]');
        this.shares = sharedObj.map((obj) => new ShareInfo(obj));

        this.numOfArtefacts = serverObj.numOfArtefacts;
        this.numOfColsFrags = serverObj.numOfColsFrags;

        this.locked = serverObj.locked === 1;
        this.lastEdit = serverObj.lastEdit ? new Date(Date.parse(serverObj.lastEdit)) : null;
    }
}

export { ScrollInfo, ScrollVersionInfo };
