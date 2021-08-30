<template>
    <div class="edition-icons">
        <label v-if="readOnly">
            <i v-b-tooltip.hover.bottom :title="$t('home.lock')" class="fa fa-lock ml-2"></i> {{ showText ? $t('home.lock') : '' }}
        </label>
        <label v-if="shared">
            <i v-b-tooltip.hover.bottom :title="$t('home.shared')" class="fa fa-users ml-2"></i> {{ showText ? $t('home.shared') : '' }}
        </label>
        <!-- <b-button
            class="ml-1 mb-1"
            v-if="readOnly"
            v-b-modal.copy-edition-modal
            v-b-tooltip.hover.bottom
            title="Public Edition. Copy this Edition in order to Edit it."
            variant="link"
        >
            {{ $t('misc.copy') }}
        </b-button>
       <copy-edition-modal :visible="false" > </copy-edition-modal> -->
        <!-- :visible="false" to prevent false display of the modal -->
    </div>

</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import { EditionInfo } from '@/models/edition';

@Component({
    name: 'edition-icons',
})
export default class EditionIcons extends Vue {
    @Prop() private edition!: EditionInfo;
    @Prop({ default: false }) private showText!: boolean;

    private get readOnly() {
        return this.edition.permission.readOnly;
    }

    private get shared() {
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
