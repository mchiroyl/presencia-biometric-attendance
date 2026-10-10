import { useCallback, useEffect, useRef, useState } from 'react';
import { isBridgeMessage } from '../lib/bridge-protocol';
export function useBiometricDevice({ onMessage, enabled = true, url = import.meta.env.VITE_WS_BRIDGE_URL, token = import.meta.env.VITE_BRIDGE_TOKEN } = {}) {
  const [status, setStatus] = useState('disconnected'); const [mode, setMode] = useState(null);
  const [deviceState, setDeviceState] = useState('checking'); const [available, setAvailable] = useState(false); const availableRef = useRef(false);
  const socketRef = useRef(null); const callback = useRef(onMessage); const authorized = useRef(false);
  useEffect(() => { callback.current = onMessage; }, [onMessage]);
  useEffect(() => {
    if (!enabled) return;
    let stopped = false, timer, readyTimer, attempts = 0;
    function connect() {
      if (stopped) return;
      setStatus(attempts ? 'reconnecting' : 'connecting'); authorized.current = false;
      availableRef.current = false; setAvailable(false); setDeviceState('checking');
      let address;
      try {
        address = new URL(url);
        if (address.protocol !== 'ws:' || address.hostname !== '127.0.0.1' || address.port !== '8080' || !token) throw new Error();
        // URLSearchParams codifica &, + y ?; el token no se escribe en consola.
        address.searchParams.set('token', token);
      } catch { setStatus('configuration-error'); return; }
      const socket = new WebSocket(address.toString()); socketRef.current = socket;
      readyTimer = setTimeout(() => socket.close(), 8000);
      socket.onmessage = event => {
        if (stopped || socketRef.current !== socket || typeof event.data !== 'string' || event.data.length > 8192) return;
        try {
          const data = JSON.parse(event.data); if (!isBridgeMessage(data)) return;
          if (data.type === 'ready') { clearTimeout(readyTimer); attempts = 0; authorized.current = true; setMode(data.mode); setStatus('connected'); }
          if (authorized.current && data.type === 'device-status') { availableRef.current = data.available; setAvailable(data.available); setDeviceState(data.state); setMode(data.mode); }
          if (authorized.current) callback.current?.(data);
        } catch { /* Un mensaje inválido no rompe el kiosco ni se registra con datos privados. */ }
      };
      socket.onerror = () => { /* onclose programa la reconexión sin diálogos intrusivos. */ };
      socket.onclose = () => {
        if (stopped || socketRef.current !== socket) return;
        clearTimeout(readyTimer); authorized.current = false;
        availableRef.current = false; setAvailable(false); setDeviceState('disconnected');
        setStatus('reconnecting'); setMode(null);
        const delay = Math.min(30000, 1000 * 2 ** Math.min(attempts++, 5)) + Math.random() * 300;
        timer = setTimeout(connect, delay); // Solo conexión; nunca reenvía capturas.
      };
    }
    connect();
    return () => { stopped = true; authorized.current = false; clearTimeout(timer); clearTimeout(readyTimer); const socket = socketRef.current; socketRef.current = null; socket?.close(); };
  }, [url, token, enabled]);
  const send = useCallback(message => {
    const socket = socketRef.current;
    if (!authorized.current || !socket || socket.readyState !== WebSocket.OPEN) return false;
    if (['scan', 'enroll'].includes(message.type) && !availableRef.current) return false;
    socket.send(JSON.stringify(message)); return true;
  }, []);
  return { status, mode, deviceState, available, send };
}
