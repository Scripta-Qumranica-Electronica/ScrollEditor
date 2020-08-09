<template>
    <div>
        <text-line
            v-for="line in fragment.lines"
            :key="line.lineId"
            :line="line"
            direction="rtl"
        ></text-line>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Emit } from 'vue-property-decorator';
import { TextFragment, SignInterpretation } from '@/models/text';
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
</style>
