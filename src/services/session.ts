import { Store } from 'vuex';

class SessionService {
    constructor(private store: Store<any>) {}

    public async login(userName: string, password: string) {
        await new Promise((resolve) => setTimeout(resolve, 2000));  // Just to make sure things take time
        this.store.dispatch('session/logIn', { sessionId: 1, userName, fullName: userName }, { root: true });
    }

    public async logout() {
        await new Promise((resolve) => setTimeout(resolve, 2000));  // Just to make sure things take time
        this.store.dispatch('session/logOut', {}, { root: true });
    }

    public async isSessionValid() {
        const valid = false;

        await new Promise((resolve) => setTimeout(resolve, 2000));  // Just to make sure things take time

        if (!valid) {
            // Mark is if logged out, without contacting the server
            this.store.dispatch('session/logOut', {}, { root: true });
        }
        return valid;
    }
}

export default SessionService;
