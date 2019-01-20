import { Polygon } from '@/utils/Polygons';

export class Artefact {
    public id: number;
    public positionId: number;
    public shapeId: number;
    public scrollVersionId: number;
    public name: string;
    public mask: Polygon;
    public transformMatrix: any; // TODO: Change to matrix type?
    public rect: string;
    public imageCatalogId: number; // Probably not needed
    public sqeImageId: number;  // Probable not needed

    constructor(obj: any) {
        if (obj.side !== 0) {
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
}
