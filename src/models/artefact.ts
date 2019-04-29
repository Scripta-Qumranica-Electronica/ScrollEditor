import { Polygon } from '@/utils/Polygons';
import { ImagedObjectDetailed } from './imagedObject';
import { EditionInfo } from './edition';

enum artSide {
    RECTO, VERSO
}

export class Artefact {
    public static createNew(editionId: number, imagedObjectDetailed: ImagedObjectDetailed, name: string, id: number) {
         // editionId: EditionInfo
        const artefact = new Artefact({
            id: id,
            positionId: -1,
            shapeId: -1,
            editionId, // editionId.versionId,
            name,
            mask: new Polygon(''),
            transformMatrix: '',
            rect: '',
            imageCatalogId: imagedObjectDetailed.recto!.imageCatalogId,
            sqeImageId: imagedObjectDetailed.recto!.sqeImageId
        });

        if (!imagedObjectDetailed.artefacts) {
            imagedObjectDetailed.artefacts = [];
        }
        imagedObjectDetailed.artefacts.push(artefact);

        return artefact;
    }

    // Default values specified to remove an error - we initialize them in the constructor or in copyFrom.
    // Typescript does not approve of that and shows an error, because it doesn't analyze copyFrom.
    public id = 0;
    public editionId = 0;
    public imageFragmentId = 0;
    public name = '';
    public mask = {} as Polygon;
    public transformMatrix = undefined as any; // TODO: Change to matrix type?
    public zOrder = '';
    public side = artSide.RECTO;


    // public positionId = 0;
    // public shapeId = 0;
    // public rect = '';
    // public imageCatalogId = 0;
    // public sqeImageId = 0;

    constructor(obj: any) {
        if (obj instanceof Artefact) {
            this.copyFrom(obj as Artefact);
            return;
        }

        if (obj.side && obj.side !== 0) {
        // if (obj.side !== 0) {
            console.error('Received a non-recto artefact ', obj);
            throw new Error('Non-recto artefacts are not supported');
        }
        this.id = obj.id;
        this.editionId = obj.editionId;
        this.imageFragmentId = obj.imageFragmentId;
        this.name = obj.name;
        this.mask = obj.mask ? Polygon.fromWkt(obj.mask.svg) : {} as Polygon; // obj.mask
        this.transformMatrix = obj.transform_matrix;
        this.zOrder = obj.zOrder;
        this.side = obj.side;

        // this.positionId = obj.artefact_position_id;
        // this.shapeId = obj.artefact_shape_id;

        /* TODO: This should be a getter
        this.svgInCombination =
            obj.mask &&
            obj.rect &&
            obj.transform_matrix &&
            SvgPath(wktPolygonToSvg(obj.mask, wktParseRect(obj.rect)))
            .matrix(dbMatrixToSVG(obj.transform_matrix))
            .round()
            .toString() */
        // this.rect = obj.rect;
        // this.imageCatalogId = obj.image_catalog_id;
        // this.sqeImageId = obj.id_of_sqe_image;
    }

    private copyFrom(other: Artefact) {
        this.id = other.id;
        this.editionId = other.editionId;
        this.imageFragmentId = other.imageFragmentId;
        this.editionId = other.editionId;
        this.name = other.name;
        this.mask = other.mask;
        this.transformMatrix = other.transformMatrix;
        this.zOrder = other.zOrder;
        this.side = other.side;
    }
}
