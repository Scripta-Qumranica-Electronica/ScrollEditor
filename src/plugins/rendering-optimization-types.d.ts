import { RenderingOptimizationData } from './rendering-optimization';

// Vue 3 global-property augmentation.
declare module 'vue' {
    interface ComponentCustomProperties {
        $render: RenderingOptimizationData;
    }
}

export {};
