import Vue from 'vue';
import { RenderingOptimizationData } from './rendering-optimization';

declare module 'vue/types/vue' {
    interface Vue {
        $render: RenderingOptimizationData;
    }
}