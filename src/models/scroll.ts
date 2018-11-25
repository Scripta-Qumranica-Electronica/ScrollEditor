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

class ScrollVersionInfo {
    public name: string;
    public versionId: number;
    public userName: string;
    public numOfArtefacts: number;
    public numOfColsFrags: number;
    public canWrite: boolean;
    public canLock: boolean;
    public locked: boolean;
    public lastEdit: Date | null;

    constructor(serverObj: any) {
        this.name = serverObj.scrollName;
        this.versionId = serverObj.scrollVersionId;
        this.userName = serverObj.userName;
        this.numOfArtefacts = serverObj.numOfArtefacts;
        this.numOfColsFrags = serverObj.numOfColsFrags;
        this.canWrite = serverObj.canWrite === 1;
        this.canLock = serverObj.canLock === 1;
        this.locked = serverObj.locked === 1;
        this.lastEdit = serverObj.lastEdit ? new Date(Date.parse(serverObj.lastEdit)) : null;
    }
}

export { ScrollInfo, ScrollVersionInfo };
