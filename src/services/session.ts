import { LoginRequestDTO, DetailedUserDTO, UserDTO, ResetLoggedInUserPasswordRequestDTO,
    ResendUserAccountActivationRequestDTO,
    NewUserRequestDTO,
    ResetForgottenUserPasswordRequestDTO,
    AccountActivationRequestDTO,
    UserUpdateRequestDTO,
    DetailedUserTokenDTO} from '@/dtos/sqe-dtos';
import { CommHelper } from './comm-helper';
import { UserInfo } from '@/models/edition';
import { StateManager } from '@/state';


class SessionService {
    public stateManager: StateManager;

    constructor() {
        this.stateManager = StateManager.instance;
    }

    public async login(email: string, password: string) {
        const requestDto = {
            email,
            password
        } as LoginRequestDTO;
        const response = await CommHelper.post<DetailedUserTokenDTO>('/v1/users/login', requestDto, false);

        this.stateManager.session.user = response.data;
        this.stateManager.session.token = response.data.token;
    }

    public logout() {
        // No need to contact the server, we just forget the session
          this.stateManager.session.user = undefined;
          this.stateManager.session.token = undefined;
    }

    public async isTokenValid() {
        if (!this.stateManager.session.token) {
            return false;
        }

        try {
            const response = await CommHelper.get<DetailedUserDTO>('/v1/users');
            // The server returns a 401 error if the user is not logged in
            this.stateManager.session.user = response.data;
            return true;
        } catch (error) {
            this.stateManager.session.user = undefined;
            this.stateManager.session.token = undefined;
            localStorage.removeItem('token');
            return false;
        }
    }

    public async forgotPassword(email: string) {
        const body = {email} as ResendUserAccountActivationRequestDTO;
        try {
            await CommHelper.post<any>('/v1/users/forgot-password', body);
        } catch (error) {
            console.error(error);
        }
    }

    public async register(data: NewUserRequestDTO): Promise<UserInfo> {
        const response = await CommHelper.post<UserDTO>('/v1/users', data, false);
        return new UserInfo(response.data);
    }

    public async changePassword(data: ResetLoggedInUserPasswordRequestDTO) {
        await CommHelper.post<any>('/v1/users/change-password', data);
    }

    public async changeForgottenPassword(data: ResetForgottenUserPasswordRequestDTO) {
        await CommHelper.post<any>('/v1/users/change-forgotten-password', data, false);

        // TODO: Figure out if we catch an exception are rethrow a different exception, or leave
        // the Axios exception as is
    }

    public async activateUser(data: AccountActivationRequestDTO) {
        await CommHelper.post<any>('/v1/users/confirm-registration', data, false);
    }


    public async updateUser(data: UserUpdateRequestDTO) {
        await CommHelper.put<any>('/v1/users', data);
    }
}

export default SessionService;
