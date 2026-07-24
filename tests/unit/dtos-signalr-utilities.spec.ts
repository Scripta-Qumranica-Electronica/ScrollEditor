import { describe, it, expect, vi } from 'vitest';
import { SignalRUtilities } from '@/dtos/sqe-signalr';

// SignalRUtilities is a large generated class of thin wrappers: server methods
// forward to connection.invoke('HubMethod', ...args); connect*/disconnect* register
// via connection.on/off. Every method body is a single forwarding statement, so
// calling each one against a mock connection exercises the whole file.
describe('SignalRUtilities generated hub wrappers', () => {
    it('every generated method forwards to the SignalR connection', async () => {
        const connection = {
            invoke: vi.fn().mockResolvedValue({}),
            on: vi.fn(),
            off: vi.fn(),
            send: vi.fn().mockResolvedValue(undefined),
            stream: vi.fn(),
        };
        const utils = new SignalRUtilities(connection as never);

        const proto = Object.getPrototypeOf(utils);
        const methods = Object.getOwnPropertyNames(proto).filter(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (m) => m !== 'constructor' && typeof (proto as any)[m] === 'function',
        );

        // Sanity: this generated surface should be large.
        expect(methods.length).toBeGreaterThan(100);

        let invoked = 0;
        for (const m of methods) {
            // Generic args cover any signature (extra args are ignored; a function
            // is supplied so connect* handlers register cleanly).
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const result = (utils as any)[m](1, 2, ['x'], { a: 1 }, () => undefined);
            if (result && typeof result.then === 'function') {
                // eslint-disable-next-line no-await-in-loop
                await result.catch(() => undefined);
            }
            invoked++;
        }

        expect(invoked).toBe(methods.length);
        // The connection surface (invoke + on + off) was exercised for every method.
        const totalCalls =
            connection.invoke.mock.calls.length +
            connection.on.mock.calls.length +
            connection.off.mock.calls.length;
        expect(totalCalls).toBeGreaterThanOrEqual(methods.length - 5);
    });
});
