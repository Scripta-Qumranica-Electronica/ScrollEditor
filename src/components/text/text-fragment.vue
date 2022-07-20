<template>

    <div direction="rtl" class="text-fragment">
        <div class="inner-box">
            <text-line
                v-for="line in fragment.lines"
                :key="line.lineId"
                :line="line"
                direction="rtl"
                class="d-flex w-100"
                :style="{fontSize: fontSize + 'px'}"
            ></text-line>
        </div>
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
     @Prop() public fontSize!: number;
}

</script>

<style lang="scss" scoped>
.text-fragment {
    height: 100%;
    width: 100%;
    overflow-x: auto;
}

.inner-box {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
}
</style>
