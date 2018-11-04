import { Store } from 'vuex';
import { Communicator, ValidateSessionResponse } from './communications';


class SessionService {
    private communicator: Communicator;
    constructor(private store: Store<any>) {
        this.communicator = new Communicator(this.store);
    }

    public async login(userName: string, password: string) {
        const response = await this.communicator.request<ValidateSessionResponse>('validateSession', {
            USER_NAME: userName,
            PASSWORD: password,
            SCROLLVERSION: 1,
        });

        this.store.dispatch('session/logIn', {
            sessionId: response.data.SESSION_ID,
            userId: response.data.USER_ID,
            userName,
            fullName: userName,
        }, { root: true });
    }

    public logout() {
        // No need to contact the server, we just forget the session
        this.store.dispatch('session/logOut', {}, { root: true });
    }

    public async isSessionValid() {
        if (!this.store.state.session.sessionId) {
            return false;
        }

        try
        {
            const response = await this.communicator.request<ValidateSessionResponse>('validateSession', {
                SCROLLVERSION: 1,
            });
            console.log(`Got response ${response}`);
            return true;
        } catch (error) {
            console.log(`Got error response ${error}`);
            this.store.dispatch('session/logOut', {}, { root: true }); // Mark session as logged out
            return false;
        }
    }
}

export default SessionService;
