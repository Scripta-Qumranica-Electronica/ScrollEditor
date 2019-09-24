import { Component, Prop, Vue } from 'vue-property-decorator';
import { Artefact } from '@/models/artefact';
import ArtefactService from '@/services/artefact';
import ImageService from '@/services/image';
import { ImageStack } from '@/models/image';
import { BoundingBox } from '@/utils/helpers';

@Component
export default class ArtefactDataMixin extends Vue {
    @Prop() protected artefact!: Artefact;

    protected imageStack = undefined as ImageStack | undefined;
    protected masterImageManifest = null;
    protected boundingBox = new BoundingBox();
    protected loaded = false;
    private artefactService = new ArtefactService();
    private imageService = new ImageService();

    protected async mounted() {
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

        this.loaded = true;
    }
}
