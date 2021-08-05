<template>
    <b-row class="toolbar border-bottom">
        <slot />
    </b-row>
</template>
<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';

@Component({
    name: 'toolbar',
})
export default class Toolbar extends Vue {

}
</script>
<style lang="scss" scoped>

@import '@/assets/styles/_variables.scss';

.toolbar {
    height: 70px;
    padding: 10px;
    // background: $white;
}
</style>
