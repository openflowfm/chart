#!/usr/bin/env node
// Bundles server/index.ts into dist/server/index.js, and with `--watch` keeps
// it bundled and keeps a Node process running the result.
//
// Node runs `.ts` directly, but refuses to strip types from anything under
// node_modules — and `@openflow/core` is installed there as TypeScript source.
// So the server is bundled the way the device and the apps are: esbuild
// doesn't care where an import lives. Nothing is left external except Node's
// own modules; the dependencies are core and the protocol's types, and both
// belong inside the bundle.
//
// The bundle sits under dist/ so `server/index.ts`'s `../dist` still names the
// built page, from the bundle and from the source alike. `npm run build`
// builds the page first, because Vite empties dist/ when it starts.

import { spawn, type ChildProcess } from 'node:child_process';
import esbuild from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(root, 'dist', 'server', 'index.js');

const options: esbuild.BuildOptions = {
  entryPoints: [path.join(root, 'server', 'index.ts')],
  outfile: OUT,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  sourcemap: 'inline',
  legalComments: 'none',
};

if (process.argv[2] !== '--watch') {
  await esbuild.build(options);
  console.log(`bundled ${path.relative(root, OUT)}`);
  process.exit(0);
}

// Restarted on every successful rebuild rather than watched by `node --watch`,
// which cannot be pointed at a file that does not exist yet.
let child: ChildProcess | null = null;
const restart = () => {
  child?.kill();
  child = spawn(process.execPath, [OUT], { stdio: 'inherit', env: process.env });
};

const ctx = await esbuild.context({
  ...options,
  plugins: [{
    name: 'restart',
    setup(build) {
      build.onEnd((result) => {
        if (result.errors.length === 0) restart();
      });
    },
  }],
});
await ctx.watch();
console.log('server — watching server/ -> dist/server/index.js');
process.on('SIGINT', () => { child?.kill(); process.exit(0); });
process.on('SIGTERM', () => { child?.kill(); process.exit(0); });
