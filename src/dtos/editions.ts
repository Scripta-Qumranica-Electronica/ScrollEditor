import { UserDTO } from './user';

export interface EditionDTO {
    id: number;
    name: string;
    permission: PermissionDTO;
    owner: UserDTO;
    thumbnailUrl: string;
    shares: ShareDTO[];
    locked: boolean;
    isPublic: boolean;
    lastEdit?: string;
}

export interface EditionGroupDTO {
    primary: EditionDTO;
    others: EditionDTO[];
}

export interface EditionListDTO {
    editions: EditionDTO[][];
}

export interface PermissionDTO {
    canWrite: boolean;
    canAdmin: boolean;
}

export interface ShareDTO {
    user: UserDTO;
    permission: PermissionDTO;
}

export interface EditionUpdateRequestDTO {
    name: string;
}
