<template>
    <div class="bottom-scrollbar">
        <text-line
            v-for="line in fragment.lines"
            :key="line.lineId"
            :line="line"
            direction="rtl"
        ></text-line>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import { TextFragment } from '@/models/text';
import TextLine from '@/components/text/text-line.vue';

@Component({
    name: 'text-fragment',
    components: {
        'text-line': TextLine
    },
})
export default class TextFragmentComponent extends Vue {
    @Prop() public fragment!: TextFragment;
}
</script>

<style lang="scss" scoped>
.bottom-scrollbar {
    margin-left: 0.1rem;
    /* margin-right: 1rem; */
    overflow:  none;
    overflow-x: auto;
}
</style>
