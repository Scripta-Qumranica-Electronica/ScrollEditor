import { Store } from 'vuex';
import { Communicator } from './communications';
import { LoginRequestDTO, LoginResponseDTO, UserDTO, ResetLoggedInUserPasswordRequestDTO,
    ResendUserAccountActivationRequestDTO,
    NewUserRequestDTO,
    ResetForgottenUserPasswordRequestDTO,
    AccountActivationRequestDTO} from '@/dtos/user';
import { CommHelper } from './comm-helper';
import { UserInfo } from '@/models/edition';


class SessionService {
    private communicator: Communicator;
    constructor(private store: Store<any>) {
        this.communicator = new Communicator(this.store);
    }

    public async login(email: string, password: string) {
        const requestDto = {
            email,
            password
        } as LoginRequestDTO;
        const response = await CommHelper.post<LoginResponseDTO>('/v1/users/login', requestDto, false);

        this.store.dispatch('session/logIn', {
            userId: response.data.userId,
            userName: response.data.email, // forename
            token: response.data.token,
        }, {root: true});
    }

    public logout() {
        // No need to contact the server, we just forget the session
        this.store.dispatch('session/logOut', {}, { root: true });
    }

    public async isTokenValid() {
        if (!this.store.state.session.token) {
            return false;
        }

        try {
            await CommHelper.get<UserDTO>('/v1/users');  // The server returns a 401 error if the user is not logged in
            return true;
        } catch (error) {
            this.store.dispatch('session/logOut', {}, { root: true }); // Mark session as logged out
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
}

export default SessionService;
