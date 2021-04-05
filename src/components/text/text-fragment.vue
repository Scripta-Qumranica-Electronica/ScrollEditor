<template>

    <div direction="rtl"
         class="bottom-scrollbar ml-auto mr-auto "
      >
        <div direction="rtl"
             class="inner-box" >

            <text-line
                v-for="line in fragment.lines"
                :key="line.lineId"
                :line="line"
                direction="rtl"
                class="d-flex w-100"
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
}
</script>

<style lang="scss" scoped>
.bottom-scrollbar {
   display: flex;
   flex: 0 0 100%;
   justify-content: center;
    /* margin-right: 1rem; */
    height: 30%;
    min-height: 30%;
    max-height: 23rem;
    /* overflow-y:  auto; */
    overflow: auto;

}

.inner-box {
    display: flex;
    flex-wrap: wrap;
    justify-content: end;
    flex: 0 0 60rem;
    width: 60rem;
    min-width: 100%;
    max-width: 100rem;
    height: 150%;
    min-height: 100%;
    max-height: 100rem;
    padding-right: 0.5rem;
}
</style>
