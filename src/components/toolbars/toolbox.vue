<template>
    <div class="toolbox" :class="classes">
        <div class="main-content">
            <slot />
        </div>
        <div class="description">
            {{ subject || '' }}
        </div>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';

export type breakpoints = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
@Component({
    name: 'toolbox'
})
export default class Toolbox extends Vue {
    @Prop({ default: 'xs' }) public hideBelow!: string;
    @Prop({ default: '' }) public subject!: string;
    @Prop({ default: false }) public noMargins!: boolean;
    @Prop({ default: false}) public disabled!: boolean;

    public get classes() {
        let classes: string[] = [];
        if (this.hideBelow === 'xs') {
            classes = ['d-block'];
        } else {
            classes = ['d-none', `d-${this.hideBelow}-block`];
        }

        if (this.noMargins) {
            classes.push('no-margins');
        }

        return classes;
    }
}
</script>

<style lang="scss" scoped>
@import '@/assets/styles/_fonts.scss';

.toolbox {
    margin-right: 15px;

    main-content {
        display: inline-block;
    }

    &.no-margins {
        margin-right: 0px;
    }

    .description {
        margin-top: 5px;
        font-family: $font-family;
        font-size:  $font-size-0;
    }
}
</style>