import { LoginRequestDTO, DetailedUserDTO, UserDTO, ResetLoggedInUserPasswordRequestDTO,
    ResendUserAccountActivationRequestDTO,
    NewUserRequestDTO,
    ResetForgottenUserPasswordRequestDTO,
    AccountActivationRequestDTO,
    UserUpdateRequestDTO,
    DetailedUserTokenDTO,
    GithubIssueReportDTO} from '@/dtos/sqe-dtos';
import { CommHelper } from './comm-helper';
import { UserInfo } from '@/models/edition';
import { StateManager } from '@/state';
import { ApiRoutes } from '@/services/api-routes';
import { SignalRWrapper } from '@/state/signalr-connection';


class SessionService {
    private stateManager: StateManager;
    private signalR: SignalRWrapper;

    constructor() {
        this.stateManager = StateManager.instance;
        this.signalR = SignalRWrapper.instance;
    }

    public async login(email: string, password: string) {
        const requestDto = {
            email,
            password
        } as LoginRequestDTO;
        const response = await CommHelper.post<DetailedUserTokenDTO>
        (ApiRoutes.loginUrl(), requestDto, false);

        this.stateManager.session.user = response.data;
        this.stateManager.session.token = response.data.token;

        this.signalR.userChanged();
    }

    public logout() {
        // No need to contact the server, we just forget the session
          this.stateManager.session.user = null;
          this.stateManager.session.token = undefined;

          this.signalR.userChanged();
    }

    public async isTokenValid() {
        if (!this.stateManager.session.token) {
            return false;
        }

        try {
            const response = await CommHelper.get<DetailedUserDTO>(ApiRoutes.usersUrl());
            // The server returns a 401 error if the user is not logged in
            this.stateManager.session.user = response.data;
            return true;
        } catch (error) {
            this.stateManager.session.user = null;
            this.stateManager.session.token = undefined;
            localStorage.removeItem('token');
            return false;
        }
    }

    public async forgotPassword(email: string) {
        const body = {email} as ResendUserAccountActivationRequestDTO;
        try {
            await CommHelper.post<any>(ApiRoutes.forgotPasswordUrl(), body);
        } catch (error) {
            console.error(error);
        }
    }

    public async register(data: NewUserRequestDTO): Promise<UserInfo> {
        const response = await CommHelper.post<UserDTO>(ApiRoutes.usersUrl(), data, false);
        return new UserInfo(response.data);
    }

    public async changePassword(data: ResetLoggedInUserPasswordRequestDTO) {
        await CommHelper.post<any>(ApiRoutes.changePasswordUrl(), data);
    }

    public async changeForgottenPassword(data: ResetForgottenUserPasswordRequestDTO) {
        await CommHelper.post<any>(ApiRoutes.changeForgottenPasswordUrl(), data, false);

        // TODO: Figure out if we catch an exception are rethrow a different exception, or leave
        // the Axios exception as is
    }

    public async activateUser(data: AccountActivationRequestDTO) {
        await CommHelper.post<any>(ApiRoutes.confirmRegistartionUrl(), data, false);
    }


    public async updateUser(data: UserUpdateRequestDTO): Promise<DetailedUserDTO> {
        const response = await CommHelper.put<any>(ApiRoutes.usersUrl(), data);
        return  response.data;
    }

    public async reportProblem(data: GithubIssueReportDTO): Promise<boolean> {
        const response = await CommHelper.post<any>(ApiRoutes.reportProblemUrl(), data);
        return  response.data;
    }
}

export default SessionService;
