<!--

  Create a rotation toolbar component that looks like the rotation in the artefact editor

  Bind the zoom value with v-model https://www.digitalocean.com/community/tutorials/how-to-add-v-model-support-to-custom-vue-js-components

  Add another property to the component called delta, with a default of 1. This is the increment or decrement when clicking on the left or right buttons

  Add another property enable-text, when true the user can type the rotation angle in the textbox between the buttons, when it's false,
  the text box is readonly

  <rotation-toolbar v-model="params.rotate" delta="90" :enable-text"false"/>

  Make sure the rotation angle is always between 0 and 359:

  angle = ((angle % 360) + 360) % 360;

  Use this component in the ARtefact Editor, Imaged Object Editor
-->