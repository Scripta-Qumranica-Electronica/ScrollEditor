import Scroll from './scroll';

// A combination is called scroll_version in the server
class Combination {
    public name: string;
    public scrollId: number;
    public scrollVersionId: number;
    public locked: boolean;
    public userId: number;
    public sharedBy: string[];

    public get id() {
        return this.scrollVersionId;
    }


    constructor(serverObj: any) {
        this.name = serverObj.name;
        this.scrollId = serverObj.scroll_id;
        this.locked = serverObj.locked;
        this.scrollVersionId = serverObj.scroll_version_id;
        this.userId = serverObj.user_id;
        this.sharedBy = serverObj.shared_by || [];
    }
}

export default Combination;
