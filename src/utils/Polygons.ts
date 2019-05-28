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

    // Scale the polygon by a factor
    public static scale(a: Polygon, factor: number): Polygon {
        if (a.empty) {
            return new Polygon();
        }
        if (factor === 1) {
            return a;
        }

        // Match all the numbers in the SVG using a regex, which is faster than scanning in Javascript
        const re = /\d+(\.\d*)?/g; // Adapted from here: https://stackoverflow.com/a/18085/871910
        const source = a.svg;
        let scaled = '';
        let lastCopied = 0;

        while (true) {
            const match = re.exec(source);
            if (match === null) {
                break;
            }
            scaled += source.substr(lastCopied, match.index - lastCopied);
            const num = parseFloat(match[0]);
            const factored = Math.trunc(num * factor).toString();
            scaled += factored.toString();
            lastCopied = re.lastIndex;
        }
        scaled += source.substr(lastCopied);

        return new Polygon(scaled);
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

    public constructor(svg = '') {
        this._svg = this.normalizeSvg(svg);
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

    private normalizeSvg(svg: string): string {
        // Sometimes SVGs have spaces between commands and numbers, which breaks some canvases (on Chrome, at least)
        // So we normalize them. Our problem is with spaces around Ls, so that's the only thing we fix
        if (!svg) {
            return '';
        }
        return svg.replace(/ L /g, 'L');
    }
}
