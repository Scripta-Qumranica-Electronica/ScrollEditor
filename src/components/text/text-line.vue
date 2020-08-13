<template>
    <div class="text-line" :dir="direction">
        <span class="line-name">{{line.lineName}}</span>
        <text-sign v-for="sign in line.signs" :key="sign.signId" :sign="sign"></text-sign>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Emit } from 'vue-property-decorator';
import { Line, TextDirection, SignInterpretation } from '@/models/text';
import TextSign from '@/components/text/text-sign.vue';

@Component({
    name: 'text-line',
    components: {
        'text-sign': TextSign,
    },
})
export default class TextLineComponent extends Vue {
    @Prop() public line!: Line;
    @Prop({
        default: 'rtl',
    })
    public direction!: TextDirection;
}
</script>
<style lang="scss" scoped>
div.text-line {
    display: flex;
}

span.line-name {
    padding-left: 10px;
}
</style>
