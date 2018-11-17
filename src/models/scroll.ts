import Combination from './combination';

class Scroll {
    public name: string;
    public thumbnailUrl?: string;
    public combinations: Combination[] = [];
    public defaultCombination?: Combination;

    constructor(name: string) {
        this.name = name;
    }
}

export default Scroll;
