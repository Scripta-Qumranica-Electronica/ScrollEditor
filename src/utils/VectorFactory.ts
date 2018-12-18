/* tslint:disable:max-line-length no-conditional-assignment */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Matrix {
  matrix: number[][];
}

/*
 * This function transforms a well-known-text
 * polygon into an SVG path.  When a boundingBox
 * is passed, then we translate every point based
 * on the x and y position of that bounding box.
 * Otherwise, we just add each point to the string
 * unaltered.
 */

export function wktPolygonToSvg(wkt: string, boundingRect: Rect | undefined) {
  let svg = '';
  if (wkt.substring(0, 9) === 'POLYGON((') {
    const polygonInitRegex = /POLYGON/g;
    const parenInitRegex = /\(/g;
    const parenEndRegex = /\)/g;
    const polygons: string[] = wkt.split('),(');
    /**
     * This can be sped up by multithreading the parsing of each polygon,
     * and also by building the string in a more modular fashion
     * so that we don't neet to check if (svg.slice(-1) !== 'M') for
     * every point in the polygon (i.e..
     */
    polygons.forEach((polygon) => {
      svg += 'M';
      let currentPolygonSVG = '';
      polygon = polygon.replace(polygonInitRegex, '');
      polygon = polygon.replace(parenInitRegex, '');
      polygon = polygon.replace(parenEndRegex, '');
      const points = polygon.split(',');
      const length = points.length;
      let firstPoint;

      if (boundingRect) {
        // TODO: Move this entire expression to a function - shiftPoint(point, boundingRect)
        firstPoint = `${parseInt(points[0].split(' ')[0], 10) - boundingRect.x} ${parseInt(points[0].split(' ')[1], 10) -
          boundingRect.y}`;
        for (let i = 0, point; (point = points[i]); i++) {
          currentPolygonSVG += 'L';
          currentPolygonSVG += `${parseInt(point.split(' ')[0], 10) - boundingRect.x} ${parseInt(point.split(' ')[1], 10) -
            boundingRect.y}`;
          if (i === length - 1) {
            if (
              `${parseInt(point.split(' ')[0], 10) - boundingRect.x} ${parseInt(point.split(' ')[1], 10) - boundingRect.y}` !==
              firstPoint
            ) {
              currentPolygonSVG += `L${firstPoint}`;
            }
          }
        }
      } else {
        firstPoint = `${points[0].split(' ')[0]} ${points[0].split(' ')[1]}`;
        for (let i = 0, point; (point = points[i]); i++) {
          currentPolygonSVG += 'L';
          currentPolygonSVG += `${point.split(' ')[0]} ${point.split(' ')[1]}`;
          if (i === length - 1) {
            if (`${point.split(' ')[0]} ${point.split(' ')[1]}` !== firstPoint) {
              currentPolygonSVG += `L${firstPoint}`;
            }
          }
        }
      }
      // Delete the first L from the string and add it to the svg variable
      svg += currentPolygonSVG.substring(1);
    });
  }
  return svg;
}

/*
 * This function transforms a well-known-text
 * point into an SVG path.
 */
export function wktPointToSvg(geoJSON: string) {
  return geoJSON.substring(0, 6) === 'POINT('
    ? {
        x: parseFloat(geoJSON.split(' ')[0].replace('POINT(', '')),
        y: parseFloat(geoJSON.split(' ')[1]),
      }
    : undefined;
}

/*
 * This function receives a well-known-text
 * representation of a rectangle and parses
 * that to a JSON object with an x-origin,
 * y-origin, width, and hieght.
 */
export function wktParseRect(wkt: string) {
  let returnRect: Rect | undefined;
  if (wkt.substring(0, 9) === 'POLYGON((') {
    const rect = wkt.replace('POLYGON((', '');
    const coords = rect.split(',');
    const x = parseInt(coords[0].split(' ')[0], 10);
    const y = parseInt(coords[0].split(' ')[1], 10);
    const width = parseInt(coords[2].split(' ')[0], 10) - x;
    const height = parseInt(coords[2].split(' ')[1], 10) - y;
    returnRect = { x, y, width, height };
  }
  return returnRect;
}

/*
 * This function receives an SVG path and
 * converts it to a WKT Polygon.
 */
export function svgPolygonToWKT(svg: string) {
  let wkt: string | undefined;
  svg = svg.trim();
  if (svg.startsWith('M')) {
    const lineSegmentRegex = /\sL\s|L|L\s|\sL/g;
    const zTerminatorRegex = /Z/g;
    wkt = 'POLYGON(';
    const polygons = svg.split('M');
    polygons.forEach((poly) => {
      if (poly) {
        if (wkt === 'POLYGON(') {
          wkt += '(';
        } else {
          wkt += '),(';
        }
        let firstPoint;
        let points;
        const lines = poly
          .replace(lineSegmentRegex, ' ')
          .replace(zTerminatorRegex, '')
          .trim();
        points = lines.split(' ');
        firstPoint = points[0] + ' ' + points[1];
        for (let i = 0, length = points.length - 1; i <= length; i += 2) {
          wkt += points[i] + ' ' + points[i + 1];
          if (i + 2 > length) {
            if (points[i] + ' ' + points[i + 1] !== firstPoint) {
              wkt += ',' + firstPoint;
            }
          } else {
            wkt += ',';
          }
        }
      }
    });
    wkt += '))';
  }
  return wkt;
}

/*
 * This function receives an SVG path and
 * converts it to a GeoJSON Polygon.
 */
export function svgPolygonToGeoJSON(svg: string) {
  let json: any;
  svg = svg.trim();
  if (svg.startsWith('M')) {
    json = { type: 'Polygon', coordinates: [] };
    const lineSegmentRegex = /\sL\s|L|L\s|\sL/g;
    const zTerminatorRegex = /Z/g;
    const polygons = svg.split('M');
    polygons.forEach((poly, index) => {
      if (poly) {
        json.coordinates.push([]);
        const points = poly
          .replace(lineSegmentRegex, ' ')
          .replace(zTerminatorRegex, '')
          .trim()
          .split(' ');
        const length = points.length;
        const firstPoint = [Number(points[0]), Number(points[1])];
        for (let i = 0, point1, point2; (point1 = points[i]) && (point2 = points[i + 1]); i += 2) {
          json.coordinates[index - 1].push([Number(point1), Number(point2)]);
          if (i + 2 === length) {
            if (Number(point1) !== firstPoint[0] || Number(point2) !== firstPoint[1]) {
              json.coordinates[index - 1].push(firstPoint);
            }
          }
        }
      }
    });
  }
  return json;
}

/*
 * This function receives an SVG path and
 * converts it to a Clipper Polygon.
 */
export function svgPolygonToClipper(svg: string) {
  let clipper: any[] = [];
  svg = svg.trim();
  if (svg.startsWith('M')) {
    clipper = [];
    const lineSegmentRegex = /\sL\s|L|L\s|\sL/g;
    const zTerminatorRegex = /Z/g;
    const polygons = svg.split('M');
    polygons.forEach((poly, index) => {
      if (poly) {
        clipper.push([]);
        let firstPoint;
        let points;
        const lines = poly
          .replace(lineSegmentRegex, ' ')
          .replace(zTerminatorRegex, '')
          .trim();
        points = lines.split(' ');
        firstPoint = { X: Number(points[0]), Y: Number(points[1]) };
        for (let i = 0, length = points.length - 1; i <= length; i += 2) {
          clipper[index - 1].push({ X: Number(points[i]), Y: Number(points[i + 1]) });
          if (i + 2 > length) {
            if (Number(points[i]) !== firstPoint.X || Number(points[i + 1]) !== firstPoint.Y) {
              clipper[index - 1].push(firstPoint);
            }
          }
        }
      }
    });
  }
  return clipper;
}

export function clipperToSVGPolygon(paths: any[]) {
  let svgPath;
  if (paths.constructor === Array && paths[0] && paths[0][0]) {
    svgPath = '';
    for (let i = 0, lengthI = paths.length; i < lengthI; i++) {
      const firstPoint = paths[i][0].X + ' ' + paths[i][0].Y;
      svgPath += 'M';
      let currentPolygonSVG = '';
      for (let j = 0, lengthJ = paths[i].length; j < lengthJ; j++) {
        currentPolygonSVG += 'L';
        currentPolygonSVG += paths[i][j].X + ' ' + paths[i][j].Y;
        if (j === lengthJ - 1) {
          if (paths[i][j].X + ' ' + paths[i][j].Y !== firstPoint) {
            currentPolygonSVG += 'L' + firstPoint;
          }
        }
      }
      svgPath += currentPolygonSVG.substring(1);
    }
  }

  return svgPath;
}

/*
 * This function receives an GeoJSON polygon and
 * converts it to a WKT Polygon.
 */
export function geoJSONPolygonToWKT(geoJSON: any) {
  let wkt: string | undefined;
  if (typeof geoJSON === 'string' && geoJSON.substring(0, 1) === '{') {
    geoJSON = JSON.parse(geoJSON.trim());
  }
  if (geoJSON.coordinates) {
    let i: number;
    let poly;
    let point;

    wkt = 'POLYGON(';
    for (i = 0; (poly = geoJSON.coordinates[i]); i++) {
      if (wkt === 'POLYGON(') {
        wkt += '(';
      } else {
        wkt += '),(';
      }
      const firstPoint = poly[0][0] + ' ' + poly[0][1];
      const lastElement = poly.length - 1;
      for (i = 0; (point = poly[i]); i++) {
        wkt += point[0] + ' ' + point[1];
        if (i === lastElement) {
          if (point[0] + ' ' + point[1] !== firstPoint) {
            wkt += ',' + firstPoint;
          }
        } else {
          wkt += ',';
        }
      }
    }
    wkt += '))';
  }
  return wkt;
}

/*
 * This function expects the transform matrix
 * to be in a 2D array: [[a,c,tx],[b,d,ty]].
 * It returns a transform matrix which can be
 * used in an SVG element.
 */
export function dbMatrixToSVG(matrix: any): number[] | undefined {
  if (matrix.constructor === String && isJSON(matrix)) {
    matrix = JSON.parse(matrix).matrix;
  }
  return matrix.length === 2 && matrix[0].length === 3 && matrix[1].length === 3
    ? [matrix[0][0], matrix[1][0], matrix[0][1], matrix[1][1], matrix[0][2], matrix[1][2]]
    : undefined;
}

/*
 * This function converts the 6 element SVG
 * transform matrix to a JSON string for the
 * 2D transform matrix as stored in the database.
 */
export function svgMatrixToDB(matrix: number[]) {
  return Array.isArray(matrix) && matrix.length === 6
    ? `{"matrix": [[${matrix[0]},${matrix[2]},${matrix[4]}],[${matrix[1]},${matrix[3]},${
        matrix[5]
      }]]}`
    : undefined;
}

/*
 * This function converts the 16 element 3D
 * SVG transform matrix to a 6 element 2D SVG
 * transform matrix.
 */
export function matrix6To16(matrix: any) {
  return Array.isArray(matrix) && matrix.length === 6
    ? [
        matrix[0],
        matrix[1],
        0,
        0,
        matrix[2],
        matrix[3],
        0,
        0,
        0,
        0,
        1,
        0,
        matrix[4],
        matrix[5],
        0,
        1,
      ]
    : undefined;
}

/*
 * This function converts the 6 element 2D
 * SVG transform matrix to a 16 element 3D SVG
 * transform matrix.
 */
export function matrix16To6(matrix: any) {
  return Array.isArray(matrix) && matrix.length === 16
    ? [matrix[0], matrix[1], matrix[4], matrix[5], matrix[12], matrix[13]]
    : undefined;
}

/*
 * This function receives an HTML5 canvas
 * along with a svg path for the clipping
 * mask and a divisor for the canvas scaling.
 * It then draws the svg path onto the canvas.
 */
export function clipCanvas(canvas: any, svgClipPath: string, divisor: number) {
  divisor = divisor ? divisor : 1;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = 'purple';
  const polygons = svgClipPath.split('M').slice(1);
  ctx.beginPath();
  polygons.forEach((poly) => {
    const points = poly.split('L');
    for (let i = 0, length = points.length; i < length; i++) {
      if (i === 0) {
        ctx.moveTo(parseInt(points[i].split(' ')[0], 10) / divisor, parseInt(points[i].split(' ')[1], 10) / divisor);
      } else {
        ctx.lineTo(parseInt(points[i].split(' ')[0], 10) / divisor, parseInt(points[i].split(' ')[1], 10) / divisor);
      }
    }
    ctx.closePath();
  });
  ctx.fill();
}

function isJSON(str: string) {
  try {
    return JSON.parse(str) && !!str;
  } catch (e) {
    return false;
  }
}
