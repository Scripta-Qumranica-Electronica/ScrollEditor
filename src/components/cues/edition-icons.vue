<template>
    <div class="edition-icons">
        <label v-if="readOnly">
            <i v-b-tooltip.hover.bottom :title="$t('home.lock')" class="fa fa-lock ml-2"></i> {{ showText ? $t('home.lock') : '' }}
        </label>
        <label v-if="shared">
            <i v-b-tooltip.hover.bottom :title="$t('home.shared')" class="fa fa-users ml-2"></i> {{ showText ? $t('home.shared') : '' }}
        </label>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import { EditionInfo } from '@/models/edition';

@Component({
    name: 'edition-icons',
})
export default class EditionIcons extends Vue {
    @Prop() public edition!: EditionInfo;
    @Prop({ default: false }) public showText!: boolean;

    public get readOnly() {
        return this.edition.permission.readOnly;
    }

    public get shared() {
        // Some shares have no read permission, which means they have been revoked.
        return this.edition.shares.filter(share => share.permissions.mayRead).length > 1;
    }
}
</script>

<style lang="scss" scoped>
.edition-icons {
    display: inline;
    label {
        margin-right: 8px;
    }
}
</style>
