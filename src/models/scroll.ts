import Combination from './combination';

class Scroll {
    public name: string;
    public thumbnailUrls: string[];
    public scrollVersionIds: number[];
    public defaultScrollVersionId: number;
    public numImageFragments: number;
    public combinations: Combination[] = [];
    public defaultCombination?: Combination;

    constructor(serverObj: any) {
        this.name = serverObj.name;
        this.thumbnailUrls = JSON.parse(serverObj.thumbnails) || [];
        this.scrollVersionIds = JSON.parse(serverObj.scroll_version_ids);
        this.defaultScrollVersionId = serverObj.scroll_version_id;
        this.numImageFragments = serverObj.image_fragments;
    }
}

export default Scroll;
