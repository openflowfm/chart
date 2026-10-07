#!/usr/bin/env node
// `npm run dev`: the Vite dev server for the page, then the chart server told
// where it is.
//
// No dev port is fixed. Vite takes `PORT` when a launcher picked one
// (`.claude/launch.json`, `autoPort`), and otherwise a free port from the OS.
// The port is settled here, before Vite starts, because `vite.config.ts` needs
// it up front as the HMR client port (the page is proxied through the chart
// server, and the HMR socket has to dial Vite directly). Then the chart server
// is started with `OPENFLOW_CHART_UI` naming the address Vite really listens on.
//
// The chart server's own port (18000) is not a dev port — phones dial it — so
// it is left to `OPENFLOW_CHART_PORT` as before.

import { spawn } from 'node:child_process';
import net, { type AddressInfo } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** A port nothing is on, from the OS — what Vite itself does for port 0. */
function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(0, () => {
      const { port } = probe.address() as AddressInfo;
      probe.close(() => resolve(port));
    });
  });
}

const port = Number(process.env.PORT) || (await freePort());
// Read by vite.config.ts: a named port is strict, and is the HMR client port.
process.env.PORT = String(port);

const vite = await createServer({ configFile: path.join(root, 'vite.config.ts') });
await vite.listen();
const listening = (vite.httpServer?.address() as AddressInfo | null)?.port;
if (listening !== port) {
  await vite.close();
  throw new Error(`dev: Vite is on ${listening}, not the ${port} it was given`);
}
vite.printUrls();

const ui = `http://127.0.0.1:${port}`;
const server = spawn(
  process.execPath,
  ['--disable-warning=ExperimentalWarning', path.join(root, 'tools', 'server.ts'), '--watch'],
  { stdio: 'inherit', env: { ...process.env, OPENFLOW_CHART_UI: ui } },
);

let stopping = false;
async function stop(code: number): Promise<never> {
  if (!stopping) {
    stopping = true;
    server.kill('SIGTERM');
    await vite.close();
  }
  process.exit(code);
}

server.on('exit', (code) => void stop(code ?? 0));
process.on('SIGINT', () => void stop(0));
process.on('SIGTERM', () => void stop(0));
