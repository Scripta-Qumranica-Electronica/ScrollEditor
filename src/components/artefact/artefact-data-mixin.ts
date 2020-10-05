import { Component, Prop } from 'vue-property-decorator';
import { Artefact } from '@/models/artefact';
import { ImageStack } from '@/models/image';
import { BoundingBox } from '@/utils/helpers';
import AsyncMountedMixinBase from './async-mounted-mixin-base';

@Component
export default class ArtefactDataMixin extends AsyncMountedMixinBase {
    @Prop() protected artefact!: Artefact;

    protected imageStack: ImageStack | undefined = undefined;
    protected masterImageManifest = null;
    protected boundingBox = new BoundingBox();

    protected async asyncMounted() {
        await this.$state.prepare.edition(this.artefact.editionId);
        const imagedObject = this.$state.imagedObjects.find(this.artefact.imagedObjectId);
        if (!imagedObject) {
            throw new Error(
                `Can't find imaged object ${this.artefact.imagedObjectId} belonging to artefact ${this.artefact.id}`);
        }
        this.imageStack = this.artefact.side === 'recto' ? imagedObject.recto : imagedObject.verso;
        if (!this.imageStack) {
            throw new Error(`ImagedObject ${this.artefact.imagedObjectId} doesn't contain the ` +
                            `${this.artefact.side} side even though artefact ${this.artefact.id} references it`);
        }
        await this.$state.prepare.imageManifest(this.imageStack.master);
        this.masterImageManifest = this.imageStack.master.manifest;
        this.boundingBox = this.artefact.mask.getBoundingBox();
    }
}
