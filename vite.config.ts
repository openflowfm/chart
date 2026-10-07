import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

// The chart builds to `dist/`, which `server/index.ts` serves. Nothing here
// ships inside the device.
//
// No dev port is fixed or assumed: many projects and worktrees run side by
// side, so the page takes `PORT` when a launcher picked one and otherwise port
// 0, a free one from the OS. `npm run dev` (tools/dev.ts) settles the port
// first and hands it to both Vite and the chart server.
const PORT = Number(process.env.PORT) || 0;
const SERVER = process.env.OPENFLOW_CHART || 'http://127.0.0.1:18000';

export default defineConfig({
  root: here,
  plugins: [react()],
  build: {
    outDir: path.resolve(here, 'dist'),
    emptyOutDir: true,
    target: 'es2022',
    sourcemap: true,
  },
  server: {
    port: PORT,
    // A port somebody named is the one they will dial, so slipping to the next
    // would be wrong; with none named, the OS's choice is already free.
    strictPort: PORT > 0,
    /**
     * Dial this port for hot reload, whatever port served the page.
     *
     * The chart server proxies the page through :18000 so there is one address
     * in dev and in production alike — but Vite's client would then try to open
     * its socket back to :18000, where nothing speaks it. Naming the port here
     * sends the client straight to Vite instead, using the page's own hostname,
     * so it works from a phone on the LAN exactly as it does from localhost.
     *
     * Setting it changes nothing when the page is served from Vite directly:
     * this is already the port the client would have picked. With no port
     * named it is left unset, and the client dials whatever served the page —
     * right for `npm run dev:ui`; `npm run dev` always names one.
     */
    ws: PORT > 0 ? { clientPort: PORT } : {},
    // A phone can reach the dev server too, which is the only way to work on
    // this on the thing it is for.
    host: true,
    // Dev serves the page; the chart server stays the only thing talking to the
    // bridge. `text/event-stream` streams through untouched.
    proxy: {
      '/events': { target: SERVER, changeOrigin: true },
      '/tempo': { target: SERVER, changeOrigin: true },
    },
  },
});
