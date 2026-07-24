import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// A controllable fake HubConnection. HubConnectionBuilder (mocked below) yields
// one of these, letting us drive connect/subscribe/dispatch without any network.
// Everything the mock factory touches must be hoisted (vi.mock is hoisted above
// the module body), so the fakes live inside vi.hoisted().
// ---------------------------------------------------------------------------
const h = vi.hoisted(() => {
    class FakeConnection {
        public handlers = new Map<string, Set<(msg: any) => void>>();
        public onclose = vi.fn();
        public startImpl: () => Promise<void> = () => Promise.resolve();
        public start = vi.fn(() => this.startImpl());
        public stop = vi.fn(() => Promise.resolve());
        public invoke = vi.fn((..._args: any[]) => Promise.resolve());

        public on(event: string, fn: (msg: any) => void) {
            const set = this.handlers.get(event) || new Set();
            set.add(fn);
            this.handlers.set(event, set);
        }
        public off(event: string, fn: (msg: any) => void) {
            this.handlers.get(event)?.delete(fn);
        }
        public emit(event: string, msg: any) {
            for (const fn of this.handlers.get(event) || []) {
                fn(msg);
            }
        }
    }

    const built: FakeConnection[] = [];

    class FakeBuilder {
        withUrl() { return this; }
        configureLogging() { return this; }
        withAutomaticReconnect() { return this; }
        build() {
            const c = new FakeConnection();
            built.push(c);
            return c;
        }
    }

    return { FakeConnection, FakeBuilder, built };
});

type FakeConnection = InstanceType<typeof h.FakeConnection>;
const built = h.built;
const FakeBuilder = h.FakeBuilder;

vi.mock('@microsoft/signalr', () => ({
    HubConnectionBuilder: h.FakeBuilder,
    LogLevel: { Debug: 1, Error: 4 },
}));

vi.mock('@/state/current', () => ({
    currentState: () => ({ session: { token: 'tok-123' } }),
}));

import { SignalRWrapper } from '@/state/signalr-connection';
import { NotificationHandler } from '@/state/notification-handler';
import { HANDLED_EVENTS, UNHANDLED_EVENTS } from '@/state/notification-coverage';

const wrapper = SignalRWrapper.instance;

function latestConnection(): FakeConnection {
    return built[built.length - 1];
}

// Reset the singleton's private status/subscription between tests.
async function resetWrapper() {
    const w = wrapper as any;
    // Force a clean disconnected state.
    w._status = 'closed';
    w._subscribedEditionId = undefined;
    w._connection = undefined;
    w._utils = undefined;
    built.length = 0;
}

beforeEach(async () => {
    await resetWrapper();
    vi.clearAllMocks();
});

describe('registerNotificationHandler / buildDispatch', () => {
    it('is a lazily-created singleton', () => {
        expect(SignalRWrapper.instance).toBe(wrapper);
    });

    it('subscribing connects, wires every dispatch entry and invokes SubscribeToEdition', async () => {
        const handler = new NotificationHandler();
        wrapper.registerNotificationHandler(handler);

        await wrapper.subscribeEdition(5);

        const conn = latestConnection();
        // Every handled + unhandled event is registered on the connection.
        for (const [event] of HANDLED_EVENTS) {
            expect(conn.handlers.has(event)).toBe(true);
        }
        for (const event of UNHANDLED_EVENTS) {
            expect(conn.handlers.has(event)).toBe(true);
        }
        expect(conn.invoke).toHaveBeenCalledWith('SubscribeToEdition', 5);
        expect((wrapper as any)._subscribedEditionId).toBe(5);
    });

    it('dispatches a handled broadcast to its NotificationHandler method', async () => {
        const handler = new NotificationHandler();
        const [event, key] = HANDLED_EVENTS[0]; // ['UpdatedEdition', 'handleUpdatedEdition']
        const spy = vi.spyOn(handler, key as any).mockImplementation(() => undefined);
        wrapper.registerNotificationHandler(handler);
        await wrapper.subscribeEdition(7);

        latestConnection().emit(event, { id: 1 });
        expect(spy).toHaveBeenCalledWith({ id: 1 });
    });

    it('routes an unhandled broadcast to the dev-logger without throwing', async () => {
        const handler = new NotificationHandler();
        wrapper.registerNotificationHandler(handler);
        await wrapper.subscribeEdition(8);
        const event = UNHANDLED_EVENTS[0];
        expect(() => latestConnection().emit(event, { x: 1 })).not.toThrow();
    });

    it('unregister removes the handlers and clears dispatch', async () => {
        const handler = new NotificationHandler();
        wrapper.registerNotificationHandler(handler);
        await wrapper.subscribeEdition(9);
        const conn = latestConnection();
        wrapper.unregisterNotificationHandler();
        // Handlers detached.
        const [event] = HANDLED_EVENTS[0];
        expect(conn.handlers.get(event)!.size).toBe(0);
        expect((wrapper as any)._dispatch).toBeUndefined();
    });
});

describe('subscribeEdition', () => {
    it('is a no-op when already subscribed to that edition', async () => {
        wrapper.registerNotificationHandler(new NotificationHandler());
        await wrapper.subscribeEdition(10);
        const conn = latestConnection();
        conn.invoke.mockClear();
        await wrapper.subscribeEdition(10); // same id -> early return
        expect(conn.invoke).not.toHaveBeenCalled();
    });

    it('unsubscribes the previous edition before subscribing a new one', async () => {
        wrapper.registerNotificationHandler(new NotificationHandler());
        await wrapper.subscribeEdition(11);
        const conn = latestConnection();
        await wrapper.subscribeEdition(12);
        expect(conn.invoke).toHaveBeenCalledWith('UnsubscribeToEdition', 11);
        expect(conn.invoke).toHaveBeenCalledWith('SubscribeToEdition', 12);
        expect((wrapper as any)._subscribedEditionId).toBe(12);
    });

    it('leaves status closed when the connection fails to start', async () => {
        wrapper.registerNotificationHandler(new NotificationHandler());
        // Make the next-built connection reject on start.
        const origBuild = FakeBuilder.prototype.build;
        FakeBuilder.prototype.build = function () {
            const c = origBuild.call(this);
            c.startImpl = () => Promise.reject(new Error('no server'));
            return c;
        };
        await wrapper.subscribeEdition(13);
        FakeBuilder.prototype.build = origBuild;
        // connect() swallows the start error and leaves the status closed.
        expect((wrapper as any)._status).toBe('closed');
    });
});

describe('unsubscribeEdition', () => {
    it('no-ops when not connected or not subscribed', async () => {
        await expect(wrapper.unsubscribeEdition()).resolves.toBeUndefined();
    });

    it('invokes UnsubscribeToEdition when subscribed', async () => {
        wrapper.registerNotificationHandler(new NotificationHandler());
        await wrapper.subscribeEdition(20);
        const conn = latestConnection();
        conn.invoke.mockClear();
        await wrapper.unsubscribeEdition();
        expect(conn.invoke).toHaveBeenCalledWith('UnsubscribeToEdition', 20);
        expect((wrapper as any)._subscribedEditionId).toBeUndefined();
    });
});

describe('userChanged', () => {
    it('disconnects, reconnects and re-subscribes the previous edition', async () => {
        wrapper.registerNotificationHandler(new NotificationHandler());
        await wrapper.subscribeEdition(30);
        const before = latestConnection();
        await wrapper.userChanged();
        // A new connection was built and the edition re-subscribed on it.
        const after = latestConnection();
        expect(after).not.toBe(before);
        expect(after.invoke).toHaveBeenCalledWith('SubscribeToEdition', 30);
    });

    it('reconnects without re-subscribing when no edition was subscribed', async () => {
        wrapper.registerNotificationHandler(new NotificationHandler());
        await wrapper.userChanged(); // never subscribed
        // Connected, but no SubscribeToEdition call.
        const conn = latestConnection();
        expect(conn).toBeTruthy();
        for (const call of conn.invoke.mock.calls) {
            expect(call[0]).not.toBe('SubscribeToEdition');
        }
    });
});

describe('onConnectionClosed', () => {
    it('marks the connection closed and clears the subscription on an unexpected close', async () => {
        wrapper.registerNotificationHandler(new NotificationHandler());
        await wrapper.subscribeEdition(40);
        const conn = latestConnection();
        // Grab the onclose callback the wrapper registered. The source passes it
        // unbound, so invoke it with the wrapper as `this` to exercise the body.
        const closeCb = conn.onclose.mock.calls[0][0] as (e?: Error) => void;
        (wrapper as any)._status = 'connected';
        closeCb.call(wrapper, new Error('dropped'));
        expect((wrapper as any)._status).toBe('closed');
        expect((wrapper as any)._subscribedEditionId).toBeUndefined();
    });
});
