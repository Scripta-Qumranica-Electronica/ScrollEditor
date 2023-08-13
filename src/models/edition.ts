import { IIIFImage } from './image';
import {
    UserDTO,
    UpdateEditorRightsDTO,
    DetailedEditorRightsDTO,
    ArtefactGroupDTO,
    EditionManuscriptMetricsDTO,
    AttributeDTO,
    AttributeListDTO,
    AttributeValueDTO,
    EditionManuscriptMetadataDTO
} from '@/dtos/sqe-dtos';
import { PermissionDTO, EditionDTO } from '@/dtos/sqe-dtos';
import { TextFragmentData } from './text';
import { ScriptData } from './script';

type SimplifiedPermission = 'none' | 'read' | 'write' | 'admin';

class UserInfo {
    public email: string;
    public userId: number;
    public forename: string;

    constructor(dto: UserDTO) {
        this.email = dto.email;
        this.userId = dto.userId;
        this.forename = '';
    }
}

class Permissions {
    public static extractPermission(
        simplified: SimplifiedPermission
    ): UpdateEditorRightsDTO {
        const rights: UpdateEditorRightsDTO = {
            mayRead: false,
            mayWrite: false,
            isAdmin: false,
            mayLock: false
        };

        switch (simplified) {
            case 'admin':
                rights.mayLock = rights.isAdmin = true;
            case 'write':
                rights.mayWrite = true;
            case 'read':
                rights.mayRead = true;
        }

        return rights;
    }

    public mayWrite: boolean;
    public isAdmin: boolean;
    public mayRead: boolean;

    constructor(dto: PermissionDTO) {
        this.mayWrite = dto.mayWrite;
        this.isAdmin = dto.isAdmin;
        this.mayRead = dto.mayRead;
    }

    public get readOnly() {
        return !this.mayWrite;
    }

    public get simplified(): SimplifiedPermission {
        if (this.isAdmin) {
            return 'admin';
        }
        if (this.mayWrite) {
            return 'write';
        }
        if (this.mayRead) {
            return 'read';
        }
        return 'none';
    }
}

class ShareInfo {
    public static fromDTO(dto: DetailedEditorRightsDTO) {
        return new ShareInfo(dto.email, new Permissions(dto));
    }

    public email: string;
    public permissions: Permissions;

    public constructor(email: string, permissions: Permissions) {
        this.email = email;
        this.permissions = permissions;
    }

    public get simplified(): SimplifiedPermission {
        return this.permissions.simplified;
    }
}

class AttributeMetadata {
    private attributes: AttributeDTO[];

    constructor(dto: AttributeListDTO) {
        this.attributes = dto.attributes;
    }

    public get allAttributes() {
        return this.attributes;
    }

    public get multiSelectAttributes() {
        return this.attributes.filter(attr => attr.batchEditable);
    }

    public getAttribute(id: number) {
        return this.attributes.find(
            (attr: AttributeDTO) => attr.attributeId === id
        );
    }

    public getAttributeValue(attributeId: number, valueId: number) {
        const attr = this.getAttribute(attributeId);
        if (!attr) {
            return undefined;
        }
        const value = attr.values.find(
            (val: AttributeValueDTO) => val.id === valueId
        );
        return value;
    }
}

class EditionInfo {
    public id: number;
    public name: string;
    public permission: Permissions;
    public owner: UserInfo;
    public thumbnail?: IIIFImage;
    public shares: ShareInfo[];
    public invitations: ShareInfo[];
    public locked: boolean;
    public copyright: string;
    public isPublic: boolean;
    public lastEdit?: Date;
    public metrics: EditionManuscriptMetricsDTO;
    public attributeMetadata?: AttributeMetadata;
    public manuscriptId: number;

    // The following properties are updated by the EditionService upon creation
    public publicCopies: number = 1;
    public mine: boolean = false;
    public otherVersions: EditionInfo[] = [];

    // The following are loaded when necessary
    public textFragments: TextFragmentData[] = [];
    public artefactGroups: ArtefactGroup[];
    public script: ScriptData | null = null;
    public metadata: EditionManuscriptMetadataDTO | null = null;

    public get ppm(): number {
        // Pixels per milimeter
        return this.metrics.ppi / 25.4;
    }

    constructor(dto: EditionDTO) {
        this.id = dto.id;
        this.copyright = dto.copyright;
        this.name = dto.name;
        this.permission = new Permissions(dto.permission); // isAdmin, mayWrite
        this.owner = new UserInfo(dto.owner);
        this.metrics = dto.metrics;
        this.manuscriptId = dto.manuscriptId;

        // Update metrics so we have no zero-sized scrolls
        if (!this.metrics.width) {
            this.metrics.width = 1000; // One meter wide
        }
        if (!this.metrics.height) {
            this.metrics.height = 500; // 50 centimiters high
        }

        if (dto.thumbnailUrl) {
            this.thumbnail = new IIIFImage(dto.thumbnailUrl);
        }
        this.shares = dto.shares
            ? dto.shares.map(s => ShareInfo.fromDTO(s))
            : [];
        this.invitations = []; // dto.invitations ? dto.shares.map((s) => new ShareInfo(s))
        this.locked = dto.locked;
        this.isPublic = dto.isPublic;
        this.artefactGroups = [];
        this.updateLastEdit(dto.lastEdit);
    }

    public copyFrom(other: EditionInfo) {
        this.name = other.name;
        this.permission = other.permission;
        this.owner = other.owner;
        this.metrics = other.metrics;
        this.thumbnail = other.thumbnail;
        this.shares = other.shares;
        this.invitations = other.invitations;
        this.locked = other.locked;
        this.isPublic = other.isPublic;
        this.lastEdit = other.lastEdit;
    }

    public updateLastEdit(lastEdit: string | undefined) {
        if (lastEdit) {
            this.lastEdit = new Date(Date.parse(lastEdit));
        } else {
            this.lastEdit = undefined;
        }
    }
}
class ArtefactGroup {
    public static nextGroupId: number = -1;
    public static generateGroup(artefactsIds: number[], notSave?: boolean): ArtefactGroup {
        const dto: ArtefactGroupDTO = {
            id: ArtefactGroup.nextGroupId--,
            artefacts: [...artefactsIds],
            name: ''
        };
        return new ArtefactGroup(dto, notSave);
    }

    public groupId: number = 0;
    public name: string = '';
    public artefactIds: number[] = [];
    public notSave?: boolean = false;

    public get id() {
        // State collections require an id field (look for ItemWithId)
        return this.groupId;
    }

    constructor(dto: ArtefactGroupDTO, notSave?: boolean) {
        this.groupId = dto.id;
        this.name = dto.name;
        this.artefactIds = [...dto.artefacts];
        this.notSave = notSave;
    }

    public clone() {
        const dto: ArtefactGroupDTO = {
            id: this.groupId,
            artefacts: [...this.artefactIds],
            name: this.name
        };
        return new ArtefactGroup(dto);
    }
}

export {
    Permissions,
    SimplifiedPermission,
    UserInfo,
    EditionInfo,
    ShareInfo,
    ArtefactGroup,
    AttributeMetadata
};
