import type { App } from 'vue';

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

// Vue 3 plugin: exposes `this.$render` as a global property.
export default {
    install(app: App, options?: any): void {
        // TODO: Let a function calculate this based on the current browser abilities
        app.config.globalProperties.$render = {
            scalingFactors: new RenderScalingData(2, 4),
        } as RenderingOptimizationData;
    },
};
