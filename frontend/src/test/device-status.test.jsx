import { it, expect, vi, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useBiometricDevice } from '../hooks/useBiometricDevice';
import { isBridgeMessage } from '../lib/bridge-protocol';
afterEach(() => vi.unstubAllGlobals());
it('distingue autorización del puente y disponibilidad física; bloquea capturas al desconectar', () => {
  let socket;
  vi.stubGlobal('WebSocket', class {
    static OPEN = 1; readyState = 1; sent = [];
    constructor() { socket = this; }
    send(value) { this.sent.push(value); }
    close() {}
  });
  const hook = renderHook(() => useBiometricDevice({ url: 'ws://127.0.0.1:8080', token: 'test-secret' }));
  const emit = message => act(() => socket.onmessage({ data: JSON.stringify(message) }));
  emit({ type: 'ready', mode: 'hardware' });
  expect(hook.result.current.status).toBe('connected');
  expect(hook.result.current.available).toBe(false);
  expect(hook.result.current.send({ type: 'scan' })).toBe(false);
  emit({ type: 'device-status', mode: 'hardware', state: 'sdk-required', available: false });
  expect(hook.result.current.deviceState).toBe('sdk-required');
  emit({ type: 'device-status', mode: 'hardware', state: 'available', available: true });
  expect(hook.result.current.send({ type: 'scan' })).toBe(true);
  emit({ type: 'device-status', mode: 'hardware', state: 'disconnected', available: false });
  expect(hook.result.current.available).toBe(false);
  expect(hook.result.current.send({ type: 'enroll', ticket: 'test' })).toBe(false);
  hook.unmount();
});
it('rechaza estados de disponibilidad contradictorios o desconocidos', () => {
  expect(isBridgeMessage({ type: 'device-status', mode: 'hardware', state: 'sdk-required', available: false })).toBe(true);
  expect(isBridgeMessage({ type: 'device-status', mode: 'hardware', state: 'sdk-required', available: true })).toBe(false);
  expect(isBridgeMessage({ type: 'device-status', mode: 'hardware', state: 'invented', available: false })).toBe(false);
});
it('ignora el cierre tardío de un socket anterior después de autorizar la conexión nueva', () => {
  const sockets = [];
  vi.stubGlobal('WebSocket', class {
    static OPEN = 1; readyState = 1;
    constructor() { sockets.push(this); }
    close() {} send() {}
  });
  const hook = renderHook(({ token }) => useBiometricDevice({ url: 'ws://127.0.0.1:8080', token }), { initialProps: { token: 'first' } });
  hook.rerender({ token: 'second' });
  act(() => {
    sockets[1].onmessage({ data: JSON.stringify({ type: 'ready', mode: 'hardware' }) });
    sockets[1].onmessage({ data: JSON.stringify({ type: 'device-status', mode: 'hardware', state: 'available', available: true }) });
    sockets[0].onclose();
  });
  expect(hook.result.current.status).toBe('connected');
  expect(hook.result.current.available).toBe(true);
  expect(hook.result.current.send({ type: 'scan' })).toBe(true);
  hook.unmount();
});
