import { Component, Prop, Vue } from 'vue-property-decorator';
import { Artefact } from '@/models/artefact';
import ArtefactService from '@/services/artefact';
import ImageService from '@/services/image';
import { ImageStack } from '@/models/image';
import { BoundingBox } from '@/utils/helpers';
import AsyncMountedMixinBase from './async-mounted-mixin-base';

@Component
export default class ArtefactDataMixin extends AsyncMountedMixinBase {
    @Prop() protected artefact!: Artefact;

    protected imageStack = undefined as ImageStack | undefined;
    protected masterImageManifest = null;
    protected boundingBox = new BoundingBox();
    private artefactService = new ArtefactService();
    private imageService = new ImageService();

    protected async asyncMounted() {
        const imagedObject = await this.artefactService.getArtefactImagedObject(
            this.artefact.editionId!, this.artefact.imagedObjectId);
        this.imageStack = this.artefact.side === 'recto' ? imagedObject.recto : imagedObject.verso;
        if (!this.imageStack) {
            throw new Error(`ImagedObject ${this.artefact.imagedObjectId} doesn't contain the ` +
                            `${this.artefact.side} side even though artefact ${this.artefact.id} references it`);
        }
        await this.imageService.fetchImageManifest(this.imageStack.master);
        this.masterImageManifest = this.imageStack.master.manifest;
        this.boundingBox = this.artefact.mask.polygon.getBoundingBox();
    }
}
