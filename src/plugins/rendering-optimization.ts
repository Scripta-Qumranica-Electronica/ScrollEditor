import _Vue from 'vue';

export class RenderScalingData {
    public constructor(public image: number, public canvas: number) {

    }

    public get combined() {
        return this.canvas * this.image;
    }
}

export interface RenderingOptimizationData {
    scalingFactors: RenderScalingData;
}

export default function RenderingOptimizationPlugin(Vue: typeof _Vue, options?: any): void {
    // TODO: Let a function calculate this based on the current browser abilities
    Vue.prototype.$render = {
        scalingFactors: new RenderScalingData(2, 4),
    } as RenderingOptimizationData;
}
