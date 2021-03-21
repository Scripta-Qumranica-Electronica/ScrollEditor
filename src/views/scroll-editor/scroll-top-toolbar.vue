<template>

    <b-container no-gutters class="mt-1 mb-1 ml-0 top-toolbar" align-v="center">

        <b-row align-v="center" class="row ml-2" >
            <!-- <b-col class="col-4 col-sm-5 col-xs-5 position-zoom"> -->
            <b-col class="col-3 col-xl-3 col-lg-3 col-md-3 col-sm-3 col-xs-3 mt-1 mb-3 position-zoom">
            <!-- <b-col class="col-2 position-zoom"> -->
                <zoom-toolbar
                        v-model="localZoom"
                        delta="0.05"
                        @zoomChanged="onZoomChanged($event)"
                />
            </b-col>
             <b-col class="col-3 col-xl-3 col-md-3 col-sm-2 col-xs-2">
                <b-form-checkbox
                    switch
                    size="sm"
                    @input="onTextMode($event)"
                    >Material Mode / Text Mode
                </b-form-checkbox>
            </b-col>

            <b-col class="col-6 col-xl-6 col-lg-6 col-md-6 col-sm-6 col-xs-6">
                <b-row>

                    <b-col class="col-xl-3 col-md-3">
                        <b-form-checkbox
                            switch
                            size="sm"
                            @input="onDisplayROIs($event)"
                            >Display ROIs
                        </b-form-checkbox>
                    </b-col>

                    <b-col class="col-xl-5 col-md-5">
                        <b-form-checkbox
                            switch
                            size="sm"
                            @input="
                                onDisplayReconstructedText($event)
                            "
                            >Display Reconstructed Text
                        </b-form-checkbox>
                    </b-col>

                    <b-col class="col-xl-3 col-md-3">
                        <b-form-checkbox
                            switch
                            size="sm"
                            @input="onDisplayText($event)"
                            >Display Text
                        </b-form-checkbox>
                    </b-col>

                </b-row>
            </b-col>
        </b-row>

    </b-container>
</template>

<script lang="ts">
import { Component, Emit, Model, Vue } from 'vue-property-decorator';

import { ScrollEditorState } from '@/state/scroll-editor';
import ZoomToolbar from '@/components/toolbars/zoom-toolbar.vue';


@Component({
    name: 'scroll-top-toolbar',
    components: {
        'zoom-toolbar': ZoomToolbar,
    },
})

export default class ScrollTopToolbar extends Vue {

    @Model ('zoomChangedGlobal', {type: Number}) private paramsZoom!: number;

    private localZoom: number = this.paramsZoom || 0.01;

    private onZoomChanged(val: number) {
        this.localZoom = val;
        this.$emit('zoomChangedGlobal', val);

    }

    private get scrollEditorState(): ScrollEditorState {
        return this.$state.scrollEditor;
    }

    private onDisplayROIs(value: boolean) {
        this.scrollEditorState.displayRois = value;
    }
    private onDisplayReconstructedText(value: boolean) {
        this.scrollEditorState.displayReconstructedText = value;
    }
    private onDisplayText(value: boolean) {
        this.scrollEditorState.displayText = value;
    }
    private onTextMode(value: boolean) {
        this.scrollEditorState.mode = value ? 'text' : 'manuscript';
    }
}
</script>

<style lang="scss" scoped>
@import '@/assets/styles/_variables.scss';
@import '@/assets/styles/_fonts.scss';

.top-toolbar {
    height: 3rem;
    /* height: 70px; */
}
</style>