import { Store } from 'vuex';
import { Communicator, ValidateTokenResponse, Login } from './communications';
import { LoginRequestDTO, LoginResponseDTO, UserDTO } from '@/dtos/user';
import { CommHelper } from './comm-helper';


class SessionService {
    private communicator: Communicator;
    constructor(private store: Store<any>) {
        this.communicator = new Communicator(this.store);
    }

    // public async login(userName: string, password: string) {
    //     const response = await this.communicator.request<ValidateSessionResponse>('validateSession', {
    //         USER_NAME: userName,
    //         PASSWORD: password,
    //         SCROLLVERSION: 1,
    //     });

    //     this.store.dispatch('session/logIn', {
    //         sessionId: response.data.SESSION_ID,
    //         userId: response.data.USER_ID,
    //         userName,
    //         fullName: userName,
    //     }, { root: true });
    // }

    public async login(userName: string, password: string) {
        const requestDto = {
            userName,
            password
        } as LoginRequestDTO;
        const response = await CommHelper.post<LoginResponseDTO>('/v1/users/login', requestDto, false);

        this.store.dispatch('session/logIn', {
            userId: response.data.userId,
            userName: response.data.userName,
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
            // await this.communicator.getRequest<ValidateTokenResponse>('/v1/user');
            return true;
        } catch (error) {
            this.store.dispatch('session/logOut', {}, { root: true }); // Mark session as logged out
            return false;
        }
    }
}

export default SessionService;
