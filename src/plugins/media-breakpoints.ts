import Vue from '*.vue';
import { BreakPointManager } from '@yutahaga/vue-media-breakpoints/lib';

export const GRID_BREAKPOINTS = {
    xs: 0,
    sm: 576,
    md: 768,
    lg: 1200,
    xl: 1800,
  };

declare module 'vue/types/vue' {
    interface Vue {
      $bp: BreakPointManager<typeof GRID_BREAKPOINTS>;
    }
  
}