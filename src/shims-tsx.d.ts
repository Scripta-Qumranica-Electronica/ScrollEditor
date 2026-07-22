import 'vue';

declare global {
  namespace JSX {
    // tslint:disable no-empty-interface
    interface Element {}
    // tslint:disable no-empty-interface
    interface ElementClass {}
    interface IntrinsicElements {
      [elem: string]: any;
    }
  }
}
