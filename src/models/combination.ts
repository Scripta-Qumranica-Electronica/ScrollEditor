class Combination {
    public name: string;
    public id: number;
    public versionId: number;
    public locked: boolean;
    public userId: number;
    public cols: any[];
    public lines: any[];
    public images: any[];
    public artefacts: any[];
    public rois: any[];
    public initialSignId?: number;

    constructor(serverObj: any) {
        this.name = serverObj.name;
        this.id = serverObj.scroll_id;
        this.locked = serverObj.locked;
        this.versionId = serverObj.scroll_version_id;
        this.userId = serverObj.user_id;
        this.cols = serverObj.cols || [];   // TODO: Change this into a class
        this.lines = serverObj.lines || []; // TODO: Change this into a class
        this.images = serverObj.imageReferences || []; // TODO: Change this into a class
        this.artefacts = serverObj.artefacts || [];
        this.rois = serverObj.rois || [];
        this.initialSignId = serverObj.initial_sign_id;
    }
}

export default Combination;
