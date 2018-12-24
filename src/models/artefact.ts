export enum Side {
    recto, verso
}

export class Artefact {
    public id: number;
    public positionId: number;
    public shapeId: number;
    public scrollVersionId: number;
    public name: string;
    public side: Side;
    public mask: string;
    public transformMatrix: any; // TODO: Change to a Matrix type
    public rect: any;  // TODO: Change to a Rect type
    public imageCatalogId: number; // Probably not needed
    public sqeImageId: number;  // Probable not needed
    public catalogSide: string; // May be Side, probably not needed
    public ROIs: any[]; // TODO: Change to ROI type

    constructor(obj: any) {
        this.id = obj.artefact_id;
        this.positionId = obj.artefact_position_id;
        this.shapeId = obj.artefact_shape_id;
        this.scrollVersionId = obj.scroll_version_id;
        this.name = obj.name;
        this.side = obj.side.toLowerCase() === 'verso' ? Side.verso : Side.recto;
        this.mask = obj.mask;
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
        this.catalogSide = obj.catalog_side;
        this.ROIs = obj.rois || [];
    }
  }
