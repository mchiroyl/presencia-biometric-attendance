import { createApp } from './app';
import { config } from './config';
async function main() { const app = await createApp(); await app.listen(config.port, process.env.CONTAINERIZED === 'true' ? '0.0.0.0' : '127.0.0.1'); console.log(`API local: http://localhost:${config.port} | simulación: ${config.allowSimulation ? 'ACTIVA' : 'deshabilitada'}`); }
main().catch(() => { console.error('No se pudo iniciar la API; revise configuración y SQL Server.'); process.exitCode = 1; });
