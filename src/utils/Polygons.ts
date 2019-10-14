// tslint:disable-next-line:no-var-requires
const clipperLib = require('js-clipper/clipper');

import { svgPolygonToWKT,
    svgPolygonToGeoJSON,
    svgPolygonToClipper,
    wktPolygonToSvg,
    geoJSONPolygonToWKT,
    clipperToSVGPolygon,
} from './VectorFactory';
import { BoundingBox } from './helpers';

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
        const cpr = new clipperLib.Clipper();
        cpr.AddPaths(a.clipper, clipperLib.PolyType.ptSubject, true);
        cpr.AddPaths(b.clipper, clipperLib.PolyType.ptClip, true);
        const solutionPaths = new clipperLib.Paths();

        cpr.Execute(
            clipperLib.ClipType.ctUnion,
            solutionPaths,
            clipperLib.PolyFillType.pftNonZero,
            clipperLib.PolyFillType.pftNonZero
        );

        const result = Polygon.fromClipper(solutionPaths);
        return result;
    }

    public static subtract(a: Polygon, b: Polygon): Polygon {
        if (a.empty || b.empty) {
            return a;
        }
        const cpr = new clipperLib.Clipper();
        cpr.AddPaths(a.clipper, clipperLib.PolyType.ptSubject, true);
        cpr.AddPaths(b.clipper, clipperLib.PolyType.ptClip, true);
        const solutionPaths = new clipperLib.Paths();

        cpr.Execute(
            clipperLib.ClipType.ctDifference,
            solutionPaths,
            clipperLib.PolyFillType.pftNonZero,
            clipperLib.PolyFillType.pftNonZero
          );

        const result = Polygon.fromClipper(solutionPaths);
        return result;
    }

    public static intersect(a: Polygon, b: Polygon): Polygon {
        if (a.empty || b.empty) {
            return new Polygon();
        }

        const cpr = new clipperLib.Clipper();
        cpr.AddPaths(a.clipper, clipperLib.PolyType.ptSubject, true);
        cpr.AddPaths(b.clipper, clipperLib.PolyType.ptClip, true);
        const solutionPaths = new clipperLib.Paths();

        cpr.Execute(
            clipperLib.ClipType.ctIntersection,
            solutionPaths,
            clipperLib.PolyFillType.pftNonZero,
            clipperLib.PolyFillType.pftNonZero
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

    public static clip(a: Polygon, box: BoundingBox): Polygon {
        if (a.empty) {
            return new Polygon();
        }

        // Match all the numbers in the SVG using a regex, which is faster than scanning in Javascript
        const re = /(\d+) (\d+)/g; // Adapted from here: https://stackoverflow.com/a/18085/871910
        const source = a.svg;
        let translated = '';
        let lastCopied = 0;

        while (true) {
            const match = re.exec(source);
            if (match === null) {
                break;
            }
            translated += source.substr(lastCopied, match.index - lastCopied);
            const x = parseFloat(match[1]) - box.x;
            const y = parseFloat(match[2]) - box.y;
            const num = parseFloat(match[0]);
            translated += `${x.toString()} ${y.toString()}`;
            lastCopied = re.lastIndex;
        }
        translated += source.substr(lastCopied);

        return new Polygon(translated);
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

    // Returns the bounding box of a polygon
    // This is a function and not a getter because it's not a trivial calculation, and properties should be quick
    public getBoundingBox(): BoundingBox {
        if (this.empty) {
            return new BoundingBox();
        }

        // Match all the numbers in the SVG using a regex, which is faster than scanning in Javascript
        const re = /(\d+) (\d+)/g; // Adapted from here: https://stackoverflow.com/a/18085/871910
        const source = this.svg;

        let match = re.exec(source);

        if (match === null) {
            return new BoundingBox();
        }
        const firstX = parseFloat(match[1]);
        const firstY = parseFloat(match[2]);

        // Set the starting values
        let minX = firstX;
        let minY = firstY;
        let maxX = firstX;
        let maxY = firstY;

        // Get the next match
        match = re.exec(source);
        while (match !== null) {
            const x = parseFloat(match[1]);
            const y = parseFloat(match[2]);
            if (x < minX) {
                minX = x;
            } else if (x > maxX) {
                maxX = x;
            }

            if (y < minY) {
                minY = y;
            } else if (y > maxY) {
                maxY = y;
            }

            match = re.exec(source);
        }

        return new BoundingBox(minX, minY, maxX - minX, maxY - minY);
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
