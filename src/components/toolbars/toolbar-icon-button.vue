<template>
    <b-button variant="outline-secondary"
              v-b-tooltip.hover.bottom
              :title="title"
              :disabled="disabled"
              v-on="$listeners">
        <font-awesome-icon :icon="icon" />
        <span v-if="showText" class="text d-none d-md-inline">{{ title }}</span>
    </b-button>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';

@Component({
    name: 'toolbar-icon-button'
})
export default class ToolbarIconButton extends Vue {
    @Prop() public title!: string;
    @Prop() public icon!: string;
    @Prop( { default: false }) public disabled!: boolean;
    @Prop( { default: false} ) public showText!: boolean;
}
</script>
<style lang="scss" scoped>
.text {
    margin: 5px;
}
</style>
