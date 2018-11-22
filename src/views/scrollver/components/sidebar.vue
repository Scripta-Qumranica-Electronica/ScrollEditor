<template>
    <div>
        <h5>{{ current.name }} - {{ current.userName }}</h5>
        <legend><h6>Versions</h6></legend>
        <ul>
            <li v-for="version in versions" :key="version.versionId">
                {{ version.name }} - {{ version.userName }} 
                <span v-if="version.versionId===current.versionId" class="badge badge-secondary">Current</span>
            </li>
        </ul>
    </div>
</template>

<script lang="ts">
import Vue, { PropOptions } from 'vue';
import { ScrollVersionInfo } from '@/models/scroll';

export default Vue.extend({
    name: 'scroll-ver-sidebar',
    props: {
        versions: {
            type: Array,
        } as PropOptions<ScrollVersionInfo[]>,
        current: ScrollVersionInfo,
    },
});
</script>

<style lang="scss" scoped>
ul {
    list-style-type: none;
    padding: 0px;
}
</style>
