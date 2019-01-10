import { svgPolygonToWKT,
    svgPolygonToGeoJSON,
    svgPolygonToClipper,
    wktPolygonToSvg,
    geoJSONPolygonToWKT,
    clipperToSVGPolygon } from './VectorFactory';

// A class representing a polygon. The internal representation is SVG.
// We have methods that translate the polygon to other formats, and static factory methods that import
// other formats into SVG.
//
// Please do not use the VectorFactory methods directly.
export class Polygon {
    public static fromWkt(wkt: string, boundingRect?: any) {
        const svg = wktPolygonToSvg(wkt, boundingRect);
        return new Polygon(svg);
    }

    public static fromGeoJSON(getJSON: any) {
        const wkt = geoJSONPolygonToWKT(getJSON);
        return Polygon.fromWkt(wkt);
    }

    public static fromClipper(clipper: any) {
        const svg = clipperToSVGPolygon(clipper);
        return new Polygon(svg);
    }

    // tslint:disable-next-line:variable-name
    private _svg: string;

    public constructor(svg: string) {
        this._svg = svg;
    }

    public get svg() {
        return this._svg;
    }

    public get wkt() {
        return svgPolygonToWKT(this._svg);
    }

    public get geoJSON() {
        return svgPolygonToGeoJSON(this._svg);
    }

    public get clipper() {
        return svgPolygonToClipper(this._svg);
    }
}
