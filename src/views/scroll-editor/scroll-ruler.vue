<template>
    <div class="ruler" :style="{height: height + 'px', width: width + 'px'}">
        <div class="rule-horizontal">
            <ul class="ruler-bar-horizontal">
                <li
                    :style="{ left: ppm * zoom * index + 'px'}"
                    :class="{ units : index % 10 !== 0 }"
                    v-for="(a, index) in horizontalTicksArray"
                    v-bind:key="index"
                >
                    <span v-if="(index % 10 === 0)">{{index}}</span>
                </li>
            </ul>
        </div>
        <div class="rule-vertical">
            <ul class="ruler-bar-vertical">
                <li
                    :style="{ top: ppm * zoom * index + 'px'}"
                    :class="{ units : index % 10 !== 0 }"
                    v-for="(a, index) in verticalTicksArray"
                    v-bind:key="index"
                >
                    <span v-if="(index % 10 === 0)">{{index}}</span>
                </li>
            </ul>
        </div>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import Waiting from '@/components/misc/Waiting.vue';
import { ScrollEditorParams } from '../artefact-editor/types';
import {
    ScrollEditorOperation,
    ArtefactPlacementOperation,
    GroupPlacementOperation,
    EditGroupOperation,
    EditionMetricOperation
} from './operations';
import EditionService from '@/services/edition';
import { ScrollEditorState } from '../../state/scroll-editor';
import { BoundingBox, Point } from '../../utils/helpers';

@Component({
    name: 'scroll-ruler'
})
export default class ScrollRuler extends Vue {
    @Prop() private horizontalTicks: number = 0;
    @Prop() private verticalTicks: number = 0;
    @Prop() private ppm: number = 1;
    @Prop() private zoom: number = 1;
    @Prop() private width: number = 1;
    @Prop() private height: number = 1;


    private get horizontalTicksArray() {
        return Array.from(Array(this.horizontalTicks).keys());
    }

    private get verticalTicksArray() {
        return Array.from(Array(this.verticalTicks).keys());
    }
}
</script>
<style lang="scss" scoped>
.ruler {
    position: absolute;
    //z-index: -1;
    width: 100%;
    height: 100%;
    pointer-events: none;
}

.rule-horizontal,
.rule-vertical {
    position: sticky;
    list-style: none;
    padding: 0;
    margin: 0;
}

.rule-horizontal {
    width: 100%;
    margin-left: 30px;
    height: 30px;
    top: 0;
    background: lightYellow;
}

.rule-vertical {
    height: 100%;
    width: 30px;
    left: 0;
    background: lightYellow;
}

.ruler-bar-horizontal,
.ruler-bar-vertical {
    list-style: none;
    background: lightYellow;
    color: rgb(133, 133, 133);
    margin: 0;
    padding: 0;
    white-space: nowrap;
    height: 100%;
}

.ruler-bar-horizontal {
    width: 100%;
}

.ruler-bar-vertical {
    height: 100%;
}

.ruler-bar-horizontal li,
.ruler-bar-vertical li {
    position: absolute;
    display: inline-block;
    font-size: 12px;
    line-height: 12px;
}
.ruler-bar-horizontal li {
    height: 30px;
}
.ruler-bar-horizontal li.units {
    height: 15px;
}
.ruler-bar-vertical li {
    width: 30px;
}
.ruler-bar-horizontal li:before,
.ruler-bar-vertical li:before {
    content: '';
    position: absolute;
}
.ruler-bar-horizontal li:before {
    border-left: 1px solid #ccc;
    border-color: rgb(133, 133, 133);
    height: 30px;
}
.ruler-bar-horizontal li.units:before {
    border-color: #ccc;
    height: 15px;
    top: 15px;
}
.ruler-bar-vertical li:before {
    border-top: 1px solid #ccc;
    border-color: rgb(133, 133, 133);
    width: 30px;
}
.ruler-bar-vertical li.units:before {
    border-color: #ccc;
    left: 15px;
    width: 15px;
}
</style>

