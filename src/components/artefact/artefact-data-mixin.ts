import { Component, Prop, Vue } from 'vue-property-decorator';
import { Artefact } from '@/models/artefact';
import ArtefactService from '@/services/artefact';
import ImageService from '@/services/image';
import { ImageStack } from '@/models/image';
import { BoundingBox } from '@/utils/helpers';
import AsyncMountedMixinBase from './async-mounted-mixin-base';
import { faGrinTongueSquint } from '@fortawesome/free-solid-svg-icons';
import ImagedObjectService from '@/services/imaged-object';

@Component
export default class ArtefactDataMixin extends AsyncMountedMixinBase {
    @Prop() protected artefact!: Artefact;

    protected imageStack = undefined as ImageStack | undefined;
    protected masterImageManifest = null;
    protected boundingBox = new BoundingBox();
    private imageService = new ImageService();
    private imagedObjectService = new ImagedObjectService();

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
        await this.imageService.requestImageManifest(this.imageStack.master);
        this.masterImageManifest = this.imageStack.master.manifest;
        this.boundingBox = this.artefact.mask.polygon.getBoundingBox();
    }
}
