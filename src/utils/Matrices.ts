import * as math from 'mathjs';

export class Matrix {
    public static fromDB(db: string): Matrix {
        // DB Format is basically our matrix without the 3rd row, which is always [0 0 1]
        const dbObj: any = JSON.parse(db);

        if (!dbObj.hasOwnProperty('matrix')) {
            throw Error("Can't convert to matrix: db object does not have a matrix property");
        }

        // The db object is a matrix sized 2x3 (2 rows of 3 columns)
        if (dbObj.length !== 2 || dbObj[0].length !== 3 || dbObj[1].length !== 3) {
            throw new Error("Can't convert to matrix, db object is of wrong dimensions");
        }

        dbObj.push([0, 0, 1]);
        const mat = math.matrix(dbObj);
        return new Matrix(mat);
    }

    public static multiply(mat1: Matrix, mat2: Matrix) {
        return new Matrix(math.multiply(mat1._matrix, mat2._matrix) as math.Matrix);
    }

    public static rotation(degrees: number) { // Return a rotation matrix by the angle specified in degrees
        const radians = degrees / (2 * math.pi); // math.cos and math.sin are in radians

        const mat = [
            [math.cos(radians), -math.sin(radians), 0],
            [math.sin(radians), math.cos(radians), 0],
            [0, 0, 1]
        ];
        return new Matrix(math.matrix(mat));
    }

    public static translation(x: number, y: number) { // Returns a translation matrix by x and y
        const mat = [
            [0, 0, x],
            [0, 0, y],
            [0, 0, 1]
        ];

        return new Matrix(math.matrix(mat));
    }

    // tslint:disable-next-line:variable-name
    private _matrix: math.Matrix;

    public constructor(mat: math.Matrix) {
        this._matrix = mat;
    }

    public toDB(): string {
        const array: number[][] = this._matrix.toArray() as number[][];
        const obj = {
            matrix: [array[0], array[1]]
        }

        return JSON.stringify(obj);
    }

    public toSVG(): number[] {
        const matrix: number[][] = this._matrix.toArray() as number[][];

        return [matrix[0][0], matrix[1][0], matrix[0][1], matrix[1][1], matrix[0][2], matrix[1][2]];
    }
}
