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

class ScrollVersionInfo {
    public name: string;
    public versionId: number;
    public ownerName: string;
    public permissions: Permissions;

    public shares: { [user: string]: Permissions };

    public numOfArtefacts: number;
    public numOfColsFrags: number;

    public locked: boolean;
    public lastEdit: Date | null;

    constructor(serverObj: any) {
        this.name = serverObj.scrollName;
        this.versionId = serverObj.scrollVersionId;
        this.ownerName = serverObj.userName;
        this.permissions = new Permissions(serverObj);
        this.shares = { };

        this.numOfArtefacts = serverObj.numOfArtefacts;
        this.numOfColsFrags = serverObj.numOfColsFrags;

        this.locked = serverObj.locked === 1;
        this.lastEdit = serverObj.lastEdit ? new Date(Date.parse(serverObj.lastEdit)) : null;
    }
}

export { ScrollInfo, ScrollVersionInfo };
