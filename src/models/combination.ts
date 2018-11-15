import Scroll from './scroll';

class Combination {
    public name: string;
    public id: number;
    public versionId: number;
    public locked: boolean;
    public userId: number;
    public sharedBy: string[];

    public scroll?: Scroll;

    constructor(serverObj: any) {
        this.name = serverObj.name;
        this.id = serverObj.scroll_id;
        this.locked = serverObj.locked;
        this.versionId = serverObj.scroll_version_id;
        this.userId = serverObj.user_id;
        this.sharedBy = serverObj.shared_by || [];

        // scroll will be set by the combinations service after creating all combinations
    }

    get public() {
        return this.userId === 1;
    }
}

export default Combination;
