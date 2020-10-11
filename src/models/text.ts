import {
    TextFragmentDataDTO,
    TextEditionDTO,
    TextFragmentDTO,
    LineDTO,
    SignDTO,
    SignInterpretationDTO,
    InterpretationAttributeDTO,
    InterpretationRoiDTO,
    NextSignInterpretationDTO,
    SetInterpretationRoiDTO,
    ArtefactTextFragmentMatchDTO,
    TranslateDTO
} from '@/dtos/sqe-dtos';
import { Artefact } from './artefact';
import { Polygon } from '@/utils/Polygons';
import { Position } from '@/models/misc';

class TextFragmentData {
    public id: number;
    public name: string;
    public editorId: number;

    constructor(obj: TextFragmentDataDTO) {
        this.id = obj.id;
        this.name = obj.name;
        this.editorId = obj.editorId;
    }
}

class ArtefactTextFragmentData extends TextFragmentData {
    public static createFromEditionTextFragment(tf: TextFragmentData) {
        return new ArtefactTextFragmentData({
            id: tf.id,
            name: tf.name,
            editorId: tf.editorId,
            suggested: true
        });
    }
    public certain: boolean;

    constructor(obj: ArtefactTextFragmentMatchDTO) {
        super(obj);
        this.certain = !obj.suggested;
    }
}

class Line {
    public lineId: number = 0;
    public lineName: string = '';
    public editorId: number = 0;
    public signs: Sign[] = [];

    public textFragment: TextFragment;

    constructor(obj: LineDTO, textFragment: TextFragment) {
        this.lineId = obj.lineId;
        this.lineName = obj.lineName;
        this.editorId = obj.editorId;
        if (obj.signs) {
            this.signs = obj.signs.map((s, index) => new Sign(s, this, index));
        } else {
            obj.signs = [];
        }

        this.textFragment = textFragment;
    }
}

class TextFragment {
    public textFragmentId: number = 0;
    public textFragmentName: string = '';
    public editorId: number = 0;
    public lines: Line[] = [];

    constructor(obj: TextFragmentDTO) {
        this.textFragmentId = obj.textFragmentId;
        this.textFragmentName = obj.textFragmentName;
        this.editorId = obj.editorId;
        if (obj.lines) {
            this.lines = obj.lines.map(l => new Line(l, this));
        } else {
            this.lines = [];
        }
    }

    public get id() {
        // State collections require an id field (look for ItemWithId)
        return this.textFragmentId;
    }
}

class TextEdition {
    public manuscriptId: number = 0;
    public editionName: string = '';
    public editorId: number = 0;
    public licence: string = '';
    public editors = {}; // TODO  editors: { [key: number] : EditorDTO };
    public textFragments: TextFragment[] = [];

    constructor(obj: TextEdition | TextEditionDTO) {
        if (obj instanceof TextEdition) {
            this.copyFrom(obj as TextEdition);
            return;
        }

        this.manuscriptId = obj.manuscriptId;
        this.editionName = obj.editionName;
        this.editorId = obj.editorId;
        this.licence = obj.licence;
        //  this.editors = obj.editors;
        if (obj.textFragments) {
            this.textFragments = obj.textFragments.map(
                t => new TextFragment(t)
            );
        } else {
            this.textFragments = [];
        }
    }

    private copyFrom(other: TextEdition) {
        this.manuscriptId = other.manuscriptId;
        this.editionName = other.editionName;
        this.editorId = other.editorId;
        this.licence = other.licence;
        this.editors = other.editors;
        this.textFragments = other.textFragments;
    }
}

class Sign {
    public signInterpretations: SignInterpretation[] = [];
    public line: Line;
    public indexInLine: number;

    constructor(obj: SignDTO, line: Line, index: number) {
        if (obj.signInterpretations) {
            this.signInterpretations = obj.signInterpretations.map(
                s => new SignInterpretation(s, this)
            );
        } else {
            this.signInterpretations = [];
        }
        this.line = line;
        this.indexInLine = index;
    }
}

class SignInterpretation {
    public signInterpretationId: number;
    public character?: string;
    public attributes: InterpretationAttributeDTO[]; // InterpretationAttributeDTO[];
    public rois: InterpretationRoi[]; // InterpretationRoiDTO[];
    public nextSignInterpretations: NextSignInterpretationDTO[]; // NextSignInterpretationDTO[];
    public commentary: string | null;

    public sign: Sign;

    constructor(obj: SignInterpretationDTO, sign: Sign) {
        this.signInterpretationId = obj.signInterpretationId;
        this.character = obj.character;
        this.attributes = obj.attributes;
        this.nextSignInterpretations = obj.nextSignInterpretations;
        this.commentary = obj.commentary?.commentary || null;

        if (obj.rois) {
            this.rois = obj.rois.map(roi => new InterpretationRoi(roi));
        } else {
            this.rois = [];
        }

        this.sign = sign;
    }

    public artefactRoi(artefact: Artefact) {
        return this.rois.find(roi => roi.artefactId === artefact.id);
    }

    public get id() {
        return this.signInterpretationId;
    }

    public deleteRoi(roi: InterpretationRoi) {
        const index = this.rois.findIndex(r => r.id === roi.id);
        if (index > -1) {
            this.rois.splice(index, 1);
        }
    }

    public get isReconstructed(): boolean {
        return !!this.attributes.find(attr => attr.attributeString === 'is_reconstructed');
    }

    public findAttributeIndex(attributeValueId: number) {
        return this.attributes.findIndex(attr => attr.attributeValueId === attributeValueId);
    }
}

type RoiStatus = 'original' | 'new' | 'deleted'; // We may support updating in the future

class InterpretationRoi {
    public static new(
        artefact: Artefact,
        signInterpretation: SignInterpretation,
        shape: Polygon,
        position: Position,
        rotation = 0,
    ) {
        const obj = new InterpretationRoi({
            artefactId: artefact.id,
            signInterpretationId: signInterpretation.id,
            shape: shape.wkt,
            translate: position,
            stanceRotation: rotation,
            exceptional: false,
            valuesSet: true
        });
        obj.status = 'new';
        obj.internalId = InterpretationRoi.internalIdCount;
        InterpretationRoi.internalIdCount -= 1;

        return obj;
    }

    private static internalIdCount = -1;

    public interpretationRoiId?: number;
    public artefactId: number;
    public signInterpretationId?: number;
    public shape: Polygon;
    public position: Position;
    public exceptional: boolean;
    public valuesSet: boolean;
    public status: RoiStatus;
    public rotation: number;

    // UI related fields
    public shine = false; // Shine on display

    private internalId?: number; // ID generated by the frontend, for new ROIs

    public constructor(obj: InterpretationRoiDTO | SetInterpretationRoiDTO) {
        this.artefactId = obj.artefactId;
        this.signInterpretationId = obj.signInterpretationId;
        this.shape = Polygon.fromWkt(obj.shape);
        this.position = {...obj.translate} as Position;
        this.rotation = obj.stanceRotation;
        this.exceptional = obj.exceptional;
        this.valuesSet = obj.valuesSet;

        // Check if the object is an InterprettionRoiDTO
        // We can't use instanceof, since instanceof does not work at runtime with interfaces yet.
        // So we use the old school way
        if (obj.hasOwnProperty('interpretationRoiId')) {
            this.interpretationRoiId = (obj as InterpretationRoiDTO).interpretationRoiId;
        }

        this.status = 'original';
    }

    public get id() {
        return (this.interpretationRoiId || this.internalId)!;
    }

    public clone() {
        const copy = new InterpretationRoi(
            {
                artefactId: this.artefactId,
                signInterpretationId: this.signInterpretationId,
                shape: this.shape.wkt,
                translate: {...this.position} as TranslateDTO,
                stanceRotation: this.rotation,
                exceptional: this.exceptional,
                valuesSet: this.valuesSet,
            } as InterpretationRoiDTO
        );
        copy.internalId = this.internalId;
        copy.interpretationRoiId = this.interpretationRoiId;

        return copy;
    }
}

type TextDirection = 'ltr' | 'rtl';

export {
    TextFragmentData,
    TextFragment,
    TextEdition,
    Line,
    Sign,
    SignInterpretation,
    InterpretationRoi,
    TextDirection,
    ArtefactTextFragmentData,
};
