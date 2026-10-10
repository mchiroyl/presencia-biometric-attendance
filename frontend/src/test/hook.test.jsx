import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useBiometricDevice } from '../hooks/useBiometricDevice';
class FakeSocket {
  static CONNECTING = 0; static OPEN = 1; static CLOSED = 3; static instances = [];
  readyState = 0;
  constructor(url) { this.url = String(url); FakeSocket.instances.push(this); }
  send(value) { this.sent = value; }
  close() { this.readyState = 3; this.onclose?.(); }
  ready() { this.readyState = 1; this.onopen?.(); this.onmessage?.({ data: JSON.stringify({ type: 'ready', mode: 'hardware' }) }); }
}
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); FakeSocket.instances = []; });
describe('Conexión del lector', () => {
  it('codifica el token, espera autorización ready y limpia al desmontar', () => {
    vi.stubGlobal('WebSocket', FakeSocket);
    const hook = renderHook(() => useBiometricDevice({ url: 'ws://127.0.0.1:8080', token: 'secret+&?', onMessage: () => {} }));
    expect(FakeSocket.instances).toHaveLength(1);
    const socket = FakeSocket.instances[0]; expect(new URL(socket.url).searchParams.get('token')).toBe('secret+&?');
    act(() => socket.ready()); expect(hook.result.current.status).toBe('connected');
    hook.unmount(); expect(socket.readyState).toBe(3);
  });
  it('reconecta sin reenviar capturas anteriores', () => {
    vi.useFakeTimers(); vi.stubGlobal('WebSocket', FakeSocket); const callback = vi.fn();
    const hook = renderHook(() => useBiometricDevice({ url: 'ws://127.0.0.1:8080', token: 'secret', onMessage: callback }));
    const socket = FakeSocket.instances[0]; act(() => socket.ready()); act(() => socket.close());
    expect(hook.result.current.status).toBe('reconnecting'); act(() => vi.advanceTimersByTime(2000)); expect(FakeSocket.instances).toHaveLength(2);
    expect(callback.mock.calls.every(([m]) => m.type !== 'matched')).toBe(true); hook.unmount();
  });
  it('ignora JSON inválido sin romper la sesión', () => {
    vi.stubGlobal('WebSocket', FakeSocket); const cb = vi.fn(); const hook = renderHook(() => useBiometricDevice({ url: 'ws://127.0.0.1:8080', token: 'secret', onMessage: cb }));
    const socket = FakeSocket.instances[0]; act(() => socket.ready()); cb.mockClear(); act(() => socket.onmessage({ data: '{broken' })); expect(cb).not.toHaveBeenCalled(); hook.unmount();
  });
});
