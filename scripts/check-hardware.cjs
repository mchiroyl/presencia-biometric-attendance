// Diagnóstico real de solo estado. Nunca solicita una huella, incluso si cambia la disponibilidad.
const { chromium } = require('@playwright/test');
const { readFileSync, writeFileSync } = require('node:fs');
const assert = require('node:assert/strict');
(async () => {
  const health = await (await fetch('http://127.0.0.1:3000/health')).json();
  assert.equal(health.simulation, false);
  const settings = require('dotenv').parse(readFileSync('.env', 'utf8'));
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.goto('http://127.0.0.1:5173/#kiosk');
    const status = await page.evaluate(token => new Promise((resolve, reject) => {
      const address = new URL('ws://127.0.0.1:8080'); address.searchParams.set('token', token);
      const socket = new WebSocket(address); let authorized = false, observation;
      const timer = setTimeout(() => { socket.close(); reject(new Error('Tiempo agotado al verificar el hardware')); }, 25000);
      const finish = value => { clearTimeout(timer); socket.close(); resolve(value); };
      socket.onmessage = event => {
        const message = JSON.parse(event.data);
        if (message.type === 'ready') { if (message.mode !== 'hardware') { clearTimeout(timer); socket.close(); reject(new Error('El puente está simulado')); } authorized = true; }
        if (authorized && message.type === 'device-status' && message.state !== 'checking') {
          if (observation) return;
          observation = { state: message.state, available: message.available, mode: message.mode };
          finish(observation);
        }
      };
    }), settings.VITE_BRIDGE_TOKEN);
    assert.equal(status.mode, 'hardware');
    await page.getByText('Verificando lector…', { exact: true }).first().waitFor({ state: 'hidden' });
    assert.equal(await page.getByText('Modo de prueba · Las lecturas son simuladas y se identifican en el historial.', { exact: true }).count(), 0);
    if (!status.available) assert.equal(await page.getByRole('button', { name: 'Iniciar lectura' }).isDisabled(), true);
    await page.screenshot({ path: 'docs/evidence/hardware-desktop.png', fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    await page.screenshot({ path: 'docs/evidence/hardware-mobile.png', fullPage: true });
    const report = { health, reader: status, mobileWithoutOverflow: true, executedAt: new Date().toISOString() };
    writeFileSync('docs/evidence/hardware-live.json', JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally { await browser.close(); }
})().catch(() => { console.error('Falló la verificación real; no se incluyen secretos en el diagnóstico.'); process.exitCode = 1; });
