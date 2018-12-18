import { wktPolygonToSvg, wktParseRect, dbMatrixToSVG, Matrix } from '@/utils/VectorFactory.ts';
import SvgPath from 'svgpath';

export class Artefact {
    public positionId: number;
    public id: number;
    public shapeId: number;
    public scrollVersionId: number;
    public name: string;
    public mask: string;
    public transformMatrix: Matrix;
    public rect: string;
    public imageCatalogId: number;
    public sqeImageId: number;
    public catalogSide: string;

    constructor(obj: any) {
        this.positionId = obj.aretfact_position_id;
        this.id = obj.artefact_id;
        this.shapeId = obj.artefact_shape_id;
        this.scrollVersionId = obj.scroll_version_id;
        this.name = obj.name;
        this.mask = obj.mask;
        this.transformMatrix = obj.transform_matrix;
        this.rect = obj.rect;
        this.imageCatalogId = obj.image_catalog_id;
        this.sqeImageId = obj.id_of_sqe_image;
        this.catalogSide = obj.catalog_side;
    }

    public get svg() {
        const svgMatrix = dbMatrixToSVG(this.transformMatrix) || [];
        return this.mask &&
            this.rect &&
            this.transformMatrix &&
            SvgPath(wktPolygonToSvg(this.mask, wktParseRect(this.rect)))
                .matrix(svgMatrix[0], svgMatrix[1], svgMatrix[2], svgMatrix[3], svgMatrix[4], svgMatrix[5])
                .round(0) // Make sure this rounds to the closest integer
                .toString();
    }
}
