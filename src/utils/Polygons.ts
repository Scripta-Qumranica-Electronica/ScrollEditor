// tslint:disable-next-line:no-var-requires
const ClipperLib = require('js-clipper/clipper');

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
    public static add(a: Polygon, b: Polygon): Polygon {
        if (a.empty) {
            return b;
        }
        if (b.empty) {
            return a;
        }
        const cpr = new ClipperLib.Clipper();
        cpr.AddPaths(a.clipper, ClipperLib.PolyType.ptSubject, true);
        cpr.AddPaths(b.clipper, ClipperLib.PolyType.ptClip, true);
        const solutionPaths = new ClipperLib.Paths();

        cpr.Execute(
            ClipperLib.ClipType.ctUnion,
            solutionPaths,
            ClipperLib.PolyFillType.pftNonZero,
            ClipperLib.PolyFillType.pftNonZero
        );

        const result = Polygon.fromClipper(solutionPaths);
        return result;
    }

    public static subtract(a: Polygon, b: Polygon): Polygon {
        if (a.empty || b.empty) {
            return a;
        }
        const cpr = new ClipperLib.Clipper();
        cpr.AddPaths(a.clipper, ClipperLib.PolyType.ptSubject, true);
        cpr.AddPaths(b.clipper, ClipperLib.PolyType.ptClip, true);
        const solutionPaths = new ClipperLib.Paths();

        cpr.Execute(
            ClipperLib.ClipType.ctDifference,
            solutionPaths,
            ClipperLib.PolyFillType.pftNonZero,
            ClipperLib.PolyFillType.pftNonZero
          );

        const result = Polygon.fromClipper(solutionPaths);
        return result;
    }

    public static intersect(a: Polygon, b: Polygon): Polygon {
        if (a.empty || b.empty) {
            return new Polygon();
        }

        const cpr = new ClipperLib.Clipper();
        cpr.AddPaths(a.clipper, ClipperLib.PolyType.ptSubject, true);
        cpr.AddPaths(b.clipper, ClipperLib.PolyType.ptClip, true);
        const solutionPaths = new ClipperLib.Paths();

        cpr.Execute(
            ClipperLib.ClipType.ctIntersection,
            solutionPaths,
            ClipperLib.PolyFillType.pftNonZero,
            ClipperLib.PolyFillType.pftNonZero
          );

        const result = Polygon.fromClipper(solutionPaths);
        return result;
    }

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

    public static fromSvg(svg: any) {
        return new Polygon(svg);
    }

    // tslint:disable-next-line:variable-name
    private _svg: string;

    public constructor(svg?: string) {
        this._svg = svg ? svg : '';
    }

    public get svg() {
        return this._svg;
    }

    public get wkt() {
        if (this.empty) {
            return '';
        }
        return svgPolygonToWKT(this._svg);
    }

    public get geoJSON() {
        if (this.empty) {
            return null;
        }
        return svgPolygonToGeoJSON(this._svg);
    }

    public get clipper() {
        if (this.empty) {
            return null;
        }
        return svgPolygonToClipper(this._svg);
    }

    public get empty(): boolean {
        return this._svg === '';
    }
}
