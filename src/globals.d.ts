// vue-virtual-scroller (v1) has no bundled typings. Kept as a TODO(vue3):
// component migrators should replace it with a Vue 3 compatible scroller.
declare module 'vue-virtual-scroller';

// Legacy UMD/CJS libs with no bundled typings, now imported as ESM (were
// require()'d before). @types/js-clipper declares only the bare 'js-clipper'
// entry, not the '/clipper' subpath.
declare module 'js-clipper/clipper';
declare module '@ckeditor/ckeditor5-build-classic';
