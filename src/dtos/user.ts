// A direct translation of the DTOs/User.cs DTO definition file

export interface LoginRequestDTO {
    email: string;
    password: string;
}

export interface UserDTO {
    userId: number;
    email: string;
    forename: string;
    surname: string;
    organization: string;
}

export interface LoginResponseDTO extends UserDTO {
    token: string;
}

export interface ResetLoggedInUserPasswordRequestDTO {
    oldPassword: string;
    newPassword: string;
}

export interface ResendUserAccountActivationRequestDTO {
    email: string;
}

export interface NewUserRequestDTO {
    password: string;
    email: string;
    organization: string;
    forename: string;
    surname: string;
}

export interface AccountActivationRequestDTO {
    token: string;
}

export interface ResetForgottenUserPasswordRequestDTO extends AccountActivationRequestDTO {
    password: string;
}
