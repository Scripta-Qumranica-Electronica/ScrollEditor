import {  TextFragmentDataDTO,
    TextEditionDTO,
    TextFragmentDTO,
    LineDTO,
    SignDTO,
    SignInterpretationDTO} from '@/dtos/sqe-dtos';

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

class Line {
    public lineId: number = 0;
    public lineName: string = '';
    public editorId: number = 0;
    public signs: Sign[] = [];

    constructor(obj: Line | LineDTO) {
        if (obj instanceof Line) {
            this.copyFrom(obj as Line);
            return;
        }

        this.lineId = obj.lineId;
        this.lineName = obj.lineName;
        this.editorId = obj.editorId;
        if (obj.signs) {
            this.signs = obj.signs.map((s) => new Sign(s));
        } else {
            obj.signs = [];
        }
    }

    private copyFrom(other: Line) {
        this.lineId = other.lineId;
        this.lineName = other.lineName;
        this.editorId = other.editorId;
        this.signs = other.signs;
    }
}

class TextFragment {
    public textFragmentId: number = 0;
    public textFragmentName: string = '';
    public editorId: number = 0;
    public lines: Line[] = [];

    constructor(obj: TextFragment | TextFragmentDTO) {
        if (obj instanceof TextFragment) {
            this.copyFrom(obj as TextFragment);
            return;
        }

        this.textFragmentId = obj.textFragmentId;
        this.textFragmentName = obj.textFragmentName;
        this.editorId = obj.editorId;
        if (obj.lines) {
            this.lines = obj.lines.map((l) => new Line(l));
        } else {
            this.lines = [];
        }
    }

    public get id() { // State collections require an id field (look for ItemWithId)
        return this.textFragmentId;
    }

    private copyFrom(other: TextFragment) {
        this.textFragmentId = other.textFragmentId;
        this.textFragmentName = other.textFragmentName;
        this.editorId = other.editorId;
        this.lines = other.lines;
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
          this.textFragments = obj.textFragments.map((t) => new TextFragment(t));
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

    constructor(obj: Sign | SignDTO) {
        if (obj instanceof Sign) {
            this.copyFrom(obj as Sign);
            return;
        }

        if (obj.signInterpretations) {
            this.signInterpretations = obj.signInterpretations.map((s) => new SignInterpretation(s));
        } else {
            this.signInterpretations = [];
        }
    }

    private copyFrom(other: SignDTO) {
        this.signInterpretations = other.signInterpretations;
    }
}

class SignInterpretation {
    public signInterpretationId: number;
    public character: string;
    public attributes: any []; // InterpretationAttributeDTO[];
    public rois: any []; // InterpretationRoiDTO[];
    public nextSignInterpretations: any []; // NextSignInterpretationDTO[];

    constructor(obj: SignInterpretation | SignInterpretationDTO) {
        this.signInterpretationId = obj.signInterpretationId;
        this.character = obj.character;
        this.attributes = obj.attributes;
        this.rois = obj.rois;
        this.nextSignInterpretations = obj.nextSignInterpretations;
    }
}

export { TextFragmentData, TextFragment, TextEdition, Line, Sign, SignInterpretation };

