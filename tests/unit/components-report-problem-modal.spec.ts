import { describe, it, expect, vi, beforeEach } from 'vitest';

// Component-mount unit test for ReportProblemModal. Mocks SessionService and
// modal-bus; seeds $state (session + misc). Exercises loggedIn / readyToReport
// getters, reportProblem() (anonymous, logged-in, unspecified-user) and
// init()/close()/show().

const { reportProblem } = vi.hoisted(() => ({
    reportProblem: vi.fn().mockResolvedValue({}),
}));
vi.mock('@/services/session', () => ({
    default: vi.fn(function () { return { reportProblem }; }),
}));
vi.mock('@/utils/modal-bus', () => ({
    registerModalListener: vi.fn(() => vi.fn()),
}));

import ReportProblemModal from '@/components/navigation/report-problem-modal.vue';
import { mountComponent } from './helpers/mount';

function makeState(user: any = null) {
    return { session: { user }, misc: { reportIssueData: undefined } };
}

function mountRP(state = makeState()) {
    return mountComponent(ReportProblemModal, {
        state,
        stubs: {
            'b-modal': true, 'b-row': true, 'b-col': true,
            'b-form-input': true, 'b-form-textarea': true, 'b-button': true,
        },
    });
}

describe('report-problem-modal', () => {
    beforeEach(() => vi.clearAllMocks());

    it('loggedIn reflects $state.session.user', () => {
        expect(mountRP(makeState(null)).vm.loggedIn).toBe(false);
        expect(mountRP(makeState({ email: 'a@b.c' })).vm.loggedIn).toBe(true);
    });

    it('readyToReport requires title+description (and username when anonymous)', () => {
        const w = mountRP(makeState(null));
        expect(w.vm.readyToReport).toBe(false);
        w.vm.title = 'T';
        w.vm.description = 'D';
        expect(w.vm.readyToReport).toBe(false); // still no username
        w.vm.username = 'U';
        expect(w.vm.readyToReport).toBe(true);
    });

    it('readyToReport does not require username when logged in', () => {
        const w = mountRP(makeState({ email: 'a@b.c' }));
        w.vm.title = 'T';
        w.vm.description = 'D';
        expect(w.vm.readyToReport).toBe(true);
    });

    it('reportProblem() (anonymous) submits with entered username in the title', async () => {
        const w = mountRP(makeState(null));
        w.vm.username = 'Bob';
        w.vm.title = 'Bug';
        w.vm.description = 'It broke';
        await w.vm.reportProblem();

        expect(reportProblem).toHaveBeenCalledTimes(1);
        const arg = reportProblem.mock.calls[0][0];
        expect(arg.username).toBe('Bob');
        expect(arg.title).toContain('Bob');
        expect(arg.comment).toBe('It broke');
        expect(w.vm.reported).toBe(true);
    });

    it('reportProblem() (logged in) uses the account email', async () => {
        const w = mountRP(makeState({ email: 'me@x.c' }));
        w.vm.title = 'Bug';
        w.vm.description = 'D';
        await w.vm.reportProblem();

        const arg = reportProblem.mock.calls[0][0];
        expect(arg.username).toBe('me@x.c');
        expect(arg.title).toContain('me@x.c');
    });

    it('reportProblem() falls back to "Not Specified" when anonymous with no username', async () => {
        const w = mountRP(makeState(null));
        w.vm.title = 'Bug';
        w.vm.description = 'D';
        await w.vm.reportProblem();

        const arg = reportProblem.mock.calls[0][0];
        expect(arg.username).toBe('Not Specified');
    });

    it('init() seeds from misc.reportIssueData then clears it; close()/show() toggle', () => {
        const state = makeState(null);
        state.misc.reportIssueData = { title: 'Pre', description: 'Filled' } as any;
        const w = mountRP(state);
        w.vm.reported = true;
        w.vm.init();
        expect(w.vm.reported).toBe(false);
        expect(w.vm.title).toBe('Pre');
        expect(w.vm.description).toBe('Filled');
        expect(w.vm.$state.misc.reportIssueData).toBeUndefined();

        w.vm.show();
        expect(w.vm.visible).toBe(true);
        w.vm.close();
        expect(w.vm.visible).toBe(false);
    });
});
