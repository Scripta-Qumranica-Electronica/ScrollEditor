import { describe, it, expect, vi, beforeEach } from 'vitest';

// Inert EditionService: every method used by the modal resolves harmlessly.
const inviteEditor = vi.fn().mockResolvedValue(undefined);
const updateInvitation = vi.fn().mockResolvedValue(undefined);
const updateSharePermissions = vi.fn().mockResolvedValue(undefined);
const prepareInvitations = vi.fn().mockResolvedValue(undefined);

vi.mock('@/services/edition', () => ({
    default: class {
        public inviteEditor = inviteEditor;
        public updateInvitation = updateInvitation;
        public updateSharePermissions = updateSharePermissions;
        public stateManager = { prepare: { invitations: prepareInvitations } };
    },
}));

import PermissionModal from '@/views/edition/components/permission-modal.vue';
import { mountComponent } from './helpers/mount';

function makeState(over: any = {}) {
    return {
        editions: {
            current: {
                id: 5,
                permission: { isAdmin: true },
                shares: [],
                invitations: [],
                ...over.current,
            },
        },
        session: { user: { email: 'me@x.com' } },
    };
}

function mountModal(stateOver: any = {}) {
    const toasted = { show: vi.fn() };
    const w = mountComponent(PermissionModal, {
        state: makeState(stateOver),
        mocks: { $toasted: toasted },
        stubs: {
            'b-modal': true, 'b-list-group': true, 'b-list-group-item': true,
            'b-form-input': true, 'b-form-select': true, 'b-button': true,
            'b-card': true, 'font-awesome-icon': true,
        },
    });
    return { w, toasted };
}

describe('permission-modal', () => {
    beforeEach(() => vi.clearAllMocks());

    it('exposes current + isAdmin getters', () => {
        const { w } = mountModal();
        expect(w.vm.current.id).toBe(5);
        expect(w.vm.isAdmin).toBe(true);
    });

    it('show() flips visible true', () => {
        const { w } = mountModal();
        w.vm.visible = false;
        w.vm.show();
        expect(w.vm.visible).toBe(true);
    });

    it('shown() prepares invitations and fills rows', async () => {
        const state = makeState({
            current: {
                id: 5,
                permission: { isAdmin: true },
                shares: [{ email: 'a@x.com', simplified: 'read' }],
                invitations: [{ email: 'b@x.com', simplified: 'write' }],
            },
        });
        const w = mountComponent(PermissionModal, {
            state,
            mocks: { $toasted: { show: vi.fn() } },
            stubs: { 'b-modal': true },
        });
        await w.vm.shown();
        expect(prepareInvitations).toHaveBeenCalledWith(5);
        expect(w.vm.sharesRows.length).toBe(1);
        expect(w.vm.invitationsRows.length).toBe(1);
    });

    it('update() for a share calls updateSharePermissions and toasts', async () => {
        const { w, toasted } = mountModal();
        await w.vm.update({ type: 'share', email: 'a@x.com', permission: 'write' });
        expect(updateSharePermissions).toHaveBeenCalledWith(5, 'a@x.com', 'write');
        expect(toasted.show).toHaveBeenCalled();
    });

    it('update() for an invitation calls updateInvitation and toasts', async () => {
        const { w, toasted } = mountModal();
        await w.vm.update({ type: 'invitation', email: 'c@x.com', permission: 'admin' });
        expect(updateInvitation).toHaveBeenCalledWith(5, 'c@x.com', 'admin');
        expect(toasted.show).toHaveBeenCalled();
    });

    it('invite() calls inviteEditor and resets the row on success', async () => {
        const { w } = mountModal();
        w.vm.invitationRow = { email: 'new@x.com', permission: 'admin' };
        await w.vm.invite();
        expect(inviteEditor).toHaveBeenCalledWith(5, 'new@x.com', 'admin');
        expect(w.vm.invitationRow.email).toBe('');
        expect(w.vm.invitationRow.permission).toBe('read');
        expect(w.vm.waiting).toBe(false);
    });

    it('invite() sets an error message when the service rejects', async () => {
        inviteEditor.mockRejectedValueOnce(new Error('boom'));
        const { w } = mountModal();
        w.vm.invitationRow = { email: 'x@x.com', permission: 'read' };
        await w.vm.invite();
        expect(w.vm.errorMessage).toBe('An error occured');
        expect(w.vm.waiting).toBe(false);
    });

    it('setRowShareStatus disables the row for the current user', () => {
        const { w } = mountModal();
        const row: any = { email: 'me@x.com', permission: 'read', oldPermission: 'read' };
        w.vm.setRowShareStatus(row);
        expect(row.disableRow).toBe(true);
    });

    it('setRowShareStatus enables Update when permission changed', () => {
        const { w } = mountModal();
        const row: any = { email: 'a@x.com', permission: 'write', oldPermission: 'read' };
        w.vm.setRowShareStatus(row);
        expect(row.disableRow).toBe(false);
        expect(row.buttonText).toBe('Update');
        expect(row.disableButton).toBe(false);
    });

    it('setRowShareStatus disables button when unchanged', () => {
        const { w } = mountModal();
        const row: any = { email: 'a@x.com', permission: 'read', oldPermission: 'read' };
        w.vm.setRowShareStatus(row);
        expect(row.disableButton).toBe(true);
    });

    it('setRowShareStatus shows Revoke for none', () => {
        const { w } = mountModal();
        const row: any = { email: 'a@x.com', permission: 'none', oldPermission: 'read' };
        w.vm.setRowShareStatus(row);
        expect(row.buttonText).toBe('Revoke');
    });

    it('setRowInvitStatus: Update / Resend / Revoke branches', () => {
        const { w } = mountModal();
        const changed: any = { permission: 'write', oldPermission: 'read' };
        w.vm.setRowInvitStatus(changed);
        expect(changed.buttonText).toBe('Update');

        const same: any = { permission: 'read', oldPermission: 'read' };
        w.vm.setRowInvitStatus(same);
        expect(same.buttonText).toBe('Resend');

        const revoke: any = { permission: 'none', oldPermission: 'read' };
        w.vm.setRowInvitStatus(revoke);
        expect(revoke.buttonText).toBe('Revoke');
    });

    it('invitationList / shareList getters + watch handlers refill rows', () => {
        const { w } = mountModal();
        expect(w.vm.invitationList).toEqual([]);
        expect(w.vm.shareList).toEqual([]);

        w.vm.current.invitations = [{ email: 'i@x.com', simplified: 'read' }];
        w.vm.onInvitationsChange(w.vm.current.invitations);
        expect(w.vm.invitationsRows.length).toBe(1);

        w.vm.current.shares = [{ email: 's@x.com', simplified: 'read' }];
        w.vm.onSharesChange(w.vm.current.shares);
        expect(w.vm.sharesRows.length).toBe(1);
    });
});
