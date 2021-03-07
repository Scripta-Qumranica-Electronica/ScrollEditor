<!--

  Create a zoom toolbar component that looks like the zoom in the artefact editor

  Bind the zoom value with v-model https://www.digitalocean.com/community/tutorials/how-to-add-v-model-support-to-custom-vue-js-components

  Add another property to the component called delta, with a default of 0.05. This is the increment or decrement when clicking on the + or - buttons

  Keep in mind - the textbox inside the zoom component shows the zoom value * 100, the zoom property (in v-model) is between 0 and 1.

  <zoom-toolbar v-model="params.zoom" delta="0.05"/>


  Use this component in the ARtefact Editor, Imaged Object Editor, Scroll EditorW
-->