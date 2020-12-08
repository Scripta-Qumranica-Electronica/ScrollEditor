<template>
    <b-row v-if="edition">
        <b-col class="col-1 pt-3">
            <div>
                <router-link
                    class="name-edition"
                    :to="{ path: `/editions/${edition.id}/artefacts` }"
                >
                    <span>
                        {{ edition.name }}
                    </span>
                </router-link>
            </div>
            <div>
                <span class=""> </span>
            </div>
        </b-col>
        <b-col class="pt-3 col-3 ml-5 pl-0">
            <span
                >Last edit:
                <b>{{
                    edition.lastEdit ? edition.lastEdit.toDateString() : 'N/A'
                }}</b></span
            >
        </b-col>
        <b-col class="px-0 pt-3 col-2">
            <span>Status:</span>
            <b-badge
                :class="
                    edition.status === 'published'
                        ? ['status-badge', 'status-badge-published']
                        : ['status-badge', 'status-badge-draft']
                "
                >{{ edition.status ? 'Published' : 'Draft' }}</b-badge
            >
        </b-col>
        <b-col class="pt-2 col-5 pr-0" align-h="end">
            <div>
                <b-button-group class="btns-groups">
                    <b-button variant="outline-primary" :to="artefactLink"
                        >Artefact</b-button
                    >
                    <b-button
                        variant="outline-primary"
                        :to="imagedObjectLink"
                        >Imaged Object</b-button
                    >
                    <b-button
                        variant="outline-primary"
                        :to="`/editions/${edition.id}/scroll-editor/`"
                        >Entire Manuscript</b-button
                    >
                </b-button-group>
            </div>
        </b-col>
    </b-row>
</template>

<script lang="ts">
import { ArtefactDTO } from '@/dtos/sqe-dtos';
import { Artefact } from '@/models/artefact';
import { EditionInfo } from '@/models/edition';
import { ImagedObject } from '@/models/imaged-object';
import { Component, Vue } from 'vue-property-decorator';

@Component({
    name: 'edition-header',
    components: {},
})
export default class EditionHeader extends Vue {
    public get artefact(): Artefact {
        return this.$state.artefacts.current!;
    }
    public get imagedObject(): ImagedObject {
        return this.$state.imagedObjects.current!;
    }
    public get edition(): EditionInfo | undefined {
        return this.$state.editions.current!;
    }
    public get artefactLink() {
        if (this.artefact) {
            return `/editions/${this.edition!.id}/artefacts/${
                this.artefact.id
            }`;
        }
        return `/editions/${this.edition!.id}/artefacts/`;
    }

    public get imagedObjectLink() {
        if (this.imagedObject) {
            return `/editions/${this.edition!.id}/imaged-objects/${
                this.imagedObject.id
            }`;
        }
        return `/editions/${this.edition!.id}/imaged-objects/`;
    }
}
</script>

<style lang="scss" scoped>
@import '@/assets/styles/_variables.scss';
@import '@/assets/styles/_fonts.scss';

.status-badge {
    font-family: $font-family;
    text-align: center;
    font-size: $font-size-1;
    width: 68px;
    height: 29.58px;
    line-height: 20px;
}

.status-badge-draft {
    background-color: $light-orange;
    color: $orange;
}

.status-badge-published {
    background-color: $light-greend;
    color: $green;
}

.router-link-active {
    border: 2px solid #007bff;
    color: #007bff;
}
.name-edition {
    border: transparent;
    color: black;
}
</style>