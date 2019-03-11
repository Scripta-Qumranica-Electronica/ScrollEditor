import { Polygon } from '@/utils/Polygons';
import { Fragment } from './fragment';
import { ScrollVersionInfo } from './scroll';

export class Artefact {
    public static createNew(scrollVersionId: number, fragment: Fragment, name: string) {
         // scrollVersion: ScrollVersionInfo
        const artefact = new Artefact({
            id: -1,
            positionId: -1,
            shapeId: -1,
            scrollVersionId, // scrollVersion.versionId,
            name,
            mask: new Polygon(''),
            transformMatrix: '',
            rect: '',
            imageCatalogId: fragment.recto!.imageCatalogId,
            sqeImageId: fragment.recto!.sqeImageId
        });

        if (!fragment.artefacts) {
            fragment.artefacts = [];
        }
        fragment.artefacts.push(artefact);

        return artefact;
    }

    // Default values specified to remove an error - we initialize them in the constructor or in copyFrom.
    // Typescript does not approve of that and shows an error, because it doesn't analyze copyFrom.
    public id = 0;
    public positionId = 0;
    public shapeId = 0;
    public scrollVersionId = 0;
    public name = '';
    public mask = {} as Polygon;
    public transformMatrix = undefined as any; // TODO: Change to matrix type?
    public rect = '';
    public imageCatalogId = 0;
    public sqeImageId = 0;

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
        this.id = obj.artefact_id;
        this.positionId = obj.artefact_position_id;
        this.shapeId = obj.artefact_shape_id;
        this.scrollVersionId = obj.scroll_version_id;
        this.name = obj.name;
        this.mask = Polygon.fromWkt(obj.mask);
        /* TODO: This should be a getter
        this.svgInCombination =
            obj.mask &&
            obj.rect &&
            obj.transform_matrix &&
            SvgPath(wktPolygonToSvg(obj.mask, wktParseRect(obj.rect)))
            .matrix(dbMatrixToSVG(obj.transform_matrix))
            .round()
            .toString() */
        this.transformMatrix = obj.transform_matrix;
        this.rect = obj.rect;
        this.imageCatalogId = obj.image_catalog_id;
        this.sqeImageId = obj.id_of_sqe_image;
    }

    private copyFrom(other: Artefact) {
        this.id = other.id;
        this.positionId = other.positionId;
        this.shapeId = other.shapeId;
        this.scrollVersionId = other.scrollVersionId;
        this.name = other.name;
        this.mask = other.mask;
        this.transformMatrix = other.transformMatrix;
        this.rect = other.rect;
        this.imageCatalogId = other.imageCatalogId;
        this.sqeImageId = other.sqeImageId;
    }
}
