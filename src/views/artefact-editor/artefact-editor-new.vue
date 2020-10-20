<template>
    <div>
        <div class="mb-3" style="background-color: white">
            <b-row align-v="center" class="mx-4 py-2">
                <b-col cols="2">
                    <div>
                        <span class="name-edition"> MUR 44-papLetter </span>
                    </div>
                    <div>
                        <span class="">Plate 100, frag 001, DJD 05a </span>
                    </div>
                </b-col>
                <b-col cols="2" class="">
                    <span>Last edit: <b>By Me at Jul 7,20</b></span>
                </b-col>
                <b-col class="pr-0">
                    <span>Status:</span>
                    <b-badge
                        :class="
                            true
                                ? ['status-badge', 'status-badge-Published']
                                : ['status-badge', 'status-badge-Draft']
                        "
                        >{{ true ? 'Published' : 'Draft' }}</b-badge
                    >
                </b-col>
                <b-col class="">
                    <div>
                        <b-button-group class="btns-groups">
                            <b-button variant="outline-primary"
                                >Artefacts {{ artefactsLength }}</b-button
                            >
                            <b-button variant="outline-primary"
                                >Imaged Objects
                                {{ imagedObjectsLength }}</b-button
                            >
                        </b-button-group>
                    </div>
                </b-col>
                <b-col cols="4" class="">
                    <i class="fa fa-lock mr-5"></i>
                    <i class="fa fa-lock mr-5"></i>
                    <i class="fa fa-lock mr-5"></i>
                    <i class="fa fa-lock mr-5"></i>
                    <i class="fa fa-lock mr-5"></i>
                    <i class="fa fa-lock mr-5"></i>
                    <b-button variant="primary">Save</b-button>
                </b-col>
            </b-row>
        </div>
        <b-row
            v-align="center"
            class="mt-4"
            style="background-color: white; margin-right: 5%;margin-left: 5%;"
        >
            <b-col class="col-8 border">
                <div>
                    <b-row align-v="center">
                        <b-col>
                            <b-button-group>
                                <b-button><i class="fa fa-lock"></i></b-button>
                                <b-button><i class="fa fa-lock"></i></b-button>
                                <b-button disabled>125 %</b-button>
                            </b-button-group>
                        </b-col>
                        <b-col>
                            <b-button>
                                <span><i class="fa fa-lock"></i></span>
                                <span>Adjust image</span></b-button
                            >
                        </b-col>
                        <b-col>
                            <b-button-group>
                                <b-button><i class="fa fa-lock"></i></b-button>
                                <b-button><i class="fa fa-lock"></i></b-button>
                            </b-button-group>
                        </b-col>
                        <b-col>
                            <div>
                                <span></span>
                                <b-form-checkbox switch size="sm"
                                    >Comments</b-form-checkbox
                                >
                            </div>
                        </b-col>
                        <b-col>
                            <div>
                                <span> </span>
                                <b-form-checkbox switch size="sm"
                                    >Auto character select</b-form-checkbox
                                >
                            </div>
                        </b-col>
                        <b-col>
                            <i class="fa fa-lock"></i>
                        </b-col>
                    </b-row>
                </div>
            </b-col>
            <b-col class="col-4 border">
                <div>
                    <b-row v-align="center">
                        <b-col> </b-col>
                        <b-col>
                            <b-input-group>
                                <b-form-input></b-form-input>

                                <b-input-group-append>
                                    <b-input-group-text>
                                        <i class="fa fa-lock"></i>
                                    </b-input-group-text>
                                </b-input-group-append>
                            </b-input-group>
                        </b-col>
                    </b-row>
                </div>
            </b-col>
        </b-row>
        <b-row v-align="center" style="background-color: white; margin-right: 5%;margin-left: 5%;">
            <b-col class="col-8 border">
                <div>IMAGE</div>
            </b-col>
            <b-col class="col-4 border">
                <div>TEXT</div>
            </b-col>
        </b-row>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
@Component({
    name: 'artefact-editor-new',
})
export default class ArtefactEditorNew extends Vue {}
</script>