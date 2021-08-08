<template>
    <b-button variant="outline-secondary"
            :title="title"
            :disabled="disabled"
            v-on="$listeners">
        <font-awesome-icon :icon="icon" />
        <span v-if="showText" class="button-text">{{ title }}</span>
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

    protected get button() {
        return this.$refs.button;
    }
}
</script>

<style lang="scss" scoped>
.button-text {
    margin-left: 6px;
}
</style>
