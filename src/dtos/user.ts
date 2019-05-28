// A direct translation of the DTOs/User.cs DTO definition file

export interface LoginRequestDTO {
    userName: string;
    password: string;
}

export interface UserDTO {
    userId: number;
    userName: string;
}

export interface LoginResponseDTO extends UserDTO {
    token: string;
}
