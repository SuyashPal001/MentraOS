/**
 * Production build script — two-output bundle.
 *
 * Emits two bundles under ./dist:
 *   dist/background/index.js  — the JSContext entry (no DOM, externalises
 *                                @mentra/miniapp/background because the
 *                                host's polyfill bundle provides the
 *                                runtime shape).
 *   dist/ui/index.html + ...  — the WebView entry (full DOM, Tailwind v4
 *                                compiled via bun-plugin-tailwind).
 *
 * Env vars whose name starts with `MENTRA_PUBLIC_` are inlined into both
 * bundles via `define`. Anything inlined into the UI bundle is visible
 * in WebView network requests + source maps; secrets MUST live behind
 * the developer's own backend, not in MENTRA_PUBLIC_*.
 */

import {rm} from "fs/promises"
import {reactSingletonPlugin} from "@mentra/miniapp-cli/build-helpers"

const distDir = "./dist"

await rm(distDir, {recursive: true, force: true})

const define: Record<string, string> = {}
for (const [k, v] of Object.entries(process.env)) {
  if (k.startsWith("MENTRA_PUBLIC_") && typeof v === "string") {
    define[`process.env.${k}`] = JSON.stringify(v)
  }
}

const mockNodePlugin = {
  name: "mock-node",
  setup(build: any) {
    const nodeModules = [
      "child_process",
      "module",
      "fs",
      "fs/promises",
      "path",
      "os",
      "crypto",
      "http",
      "https",
      "url",
      "events",
      "util",
      "stream",
      "tty",
      "net",
      "dns",
      "tls",
      "zlib",
      "perf_hooks",
      "async_hooks",
      "readline"
    ];
    
    build.onResolve({ filter: new RegExp(`^(${nodeModules.join("|")}|node:(${nodeModules.join("|")}))(\\/.*)?$`) }, (args: any) => {
      return { path: args.path, namespace: "mock-node" };
    });

    build.onLoad({ filter: /.*/, namespace: "mock-node" }, (args: any) => {
      if (args.path.includes("stream/web")) {
        return {
          contents: `
            export const TransformStream = globalThis.TransformStream;
            export const ReadableStream = globalThis.ReadableStream;
            export const WritableStream = globalThis.WritableStream;
          `,
          loader: "js",
        };
      }
      if (args.path === "stream" || args.path === "node:stream") {
        return {
          contents: `
            class MockStream {
              pipe() { return this; }
              on() { return this; }
              once() { return this; }
              emit() { return true; }
              write() { return true; }
              end() {}
            }
            export class Readable extends MockStream {}
            export class Writable extends MockStream {}
            export class Transform extends MockStream {}
            export class Duplex extends MockStream {}
            export class PassThrough extends MockStream {}
            export default { Readable, Writable, Transform, Duplex, PassThrough };
          `,
          loader: "js",
        };
      }
      if (args.path === "child_process" || args.path === "node:child_process") {
        return {
          contents: `
            export const execFile = () => {};
            export const execFileSync = () => '';
            export const exec = () => {};
            export default { execFile, execFileSync, exec };
          `,
          loader: "js",
        };
      }
      if (args.path === "fs" || args.path === "node:fs" || args.path.includes("fs/")) {
        return {
          contents: `
            export const realpathSync = (p) => p;
            export const existsSync = () => false;
            export const readFileSync = () => '';
            export const writeFileSync = () => {};
            export const mkdirSync = () => {};
            export const renameSync = () => {};
            export const statSync = () => ({ isDirectory: () => false, size: 0 });
            export const readdirSync = () => [];
            export const rmSync = () => {};
            export const mkdtemp = async () => '/tmp';
            export const writeFile = async () => {};
            export const rm = async () => {};
            export const createReadStream = () => ({ pipe: () => {} });
            export const constants = { O_RDONLY: 0, O_WRONLY: 1, O_RDWR: 2 };
            export const promises = {
              readFile: async () => '',
              writeFile: async () => {},
              appendFile: async () => {},
              unlink: async () => {},
              copyFile: async () => {},
              readdir: async () => [],
              rename: async () => {},
              rmdir: async () => {},
              rm: async () => {},
              readlink: async () => '',
              symlink: async () => {},
              stat: async () => ({ isDirectory: () => false }),
              lstat: async () => ({ isDirectory: () => false }),
              access: async () => {},
              mkdir: async () => {},
              realpath: async (p) => p,
              mkdtemp: async () => '/tmp'
            };
            export default { realpathSync, existsSync, readFileSync, writeFileSync, mkdirSync, renameSync, statSync, readdirSync, rmSync, createReadStream, mkdtemp, writeFile, rm, constants, promises };
          `,
          loader: "js",
        };
      }
      if (args.path === "url" || args.path === "node:url") {
        return {
          contents: `
            export const fileURLToPath = (u) => String(u);
            export const pathToFileURL = (p) => 'file://' + p;
            export default { fileURLToPath, pathToFileURL };
          `,
          loader: "js",
        };
      }
      if (args.path === "readline" || args.path === "node:readline" || args.path.includes("readline/")) {
        return {
          contents: `
            export const createInterface = () => ({ on: () => {} });
            export default { createInterface };
          `,
          loader: "js",
        };
      }
      if (args.path === "async_hooks" || args.path === "node:async_hooks") {
        return {
          contents: `
            export class AsyncLocalStorage {
              getStore() { return undefined; }
              run(store, callback) { return callback(); }
            }
            export default { AsyncLocalStorage };
          `,
          loader: "js",
        };
      }
      if (args.path === "module" || args.path === "node:module") {
        return {
          contents: `
            export const createRequire = () => () => ({});
            export default { createRequire };
          `,
          loader: "js",
        };
      }
      if (args.path === "events" || args.path === "node:events") {
        return {
          contents: `
            export class EventEmitter {
              on() { return this; }
              once() { return this; }
              emit() { return true; }
              removeListener() { return this; }
              removeAllListeners() { return this; }
              setMaxListeners() { return this; }
            }
            export default { EventEmitter };
          `,
          loader: "js",
        };
      }
      if (args.path === "crypto" || args.path === "node:crypto") {
        return {
          contents: `
            export const createHash = () => {
              const hash = {
                update: () => hash,
                digest: () => 'dummy-hash',
              };
              return hash;
            };
            export const randomUUID = () => {
              if (typeof globalThis.crypto?.randomUUID === 'function') {
                return globalThis.crypto.randomUUID();
              }
              return 'dummy-uuid-' + Math.random().toString(36).slice(2);
            };
            export const randomBytes = (size) => new Uint8Array(size);
            export default { createHash, randomUUID, randomBytes };
          `,
          loader: "js",
        };
      }
      if (args.path === "path" || args.path === "node:path" || args.path.includes("path/")) {
        return {
          contents: `
            export const relative = () => '';
            export const resolve = (...args) => args.join('/');
            export const join = (...args) => args.join('/');
            export const basename = (p) => p.split('/').pop() || '';
            export const dirname = (p) => p.split('/').slice(0, -1).join('/') || '.';
            export const extname = (p) => { const parts = p.split('.'); return parts.length > 1 ? '.' + parts.pop() : ''; };
            export const sep = '/';
            export const isAbsolute = () => false;
            export const normalize = (p) => p;
            export const parse = (p) => ({ root: '', dir: '', base: '', ext: '', name: '' });
            export const posix = { relative, resolve, join, basename, dirname, extname, sep, isAbsolute, normalize, parse };
            export default { relative, resolve, join, basename, dirname, extname, sep, posix, isAbsolute, normalize, parse };
          `,
          loader: "js",
        };
      }
      return {
        contents: `
          export default {};
          export const promises = {};
          export const existsSync = () => false;
          export const readFileSync = () => '';
          export const writeFileSync = () => {};
          export const resolve = (...args) => args.join('/');
          export const join = (...args) => args.join('/');
          export const homedir = () => '/';
          export const tmpdir = () => '/tmp';
          export const platform = () => 'browser';
          export const arch = () => 'arm64';
          export const release = () => '';
          export const cpus = () => [];
          export const totalmem = () => 0;
          export const freemem = () => 0;
          export const networkInterfaces = () => ({});
        `,
        loader: "js",
      };
    });
  }
};

const backgroundResult = await Bun.build({
  entrypoints: ["./src/background/index.ts"],
  outdir: `${distDir}/background`,
  target: "browser",
  format: "iife",
  minify: false,
  define,
  plugins: [mockNodePlugin],
})
if (!backgroundResult.success) {
  console.error("Background build failed:")
  for (const log of backgroundResult.logs) console.error(log)
  process.exit(1)
}

const tailwind = (await import("bun-plugin-tailwind")).default

const uiResult = await Bun.build({
  entrypoints: ["./src/ui/index.html"],
  outdir: `${distDir}/ui`,
  target: "browser",
  plugins: [tailwind, reactSingletonPlugin(import.meta.url)],
  minify: true,
  define,
})
if (!uiResult.success) {
  console.error("UI build failed:")
  for (const log of uiResult.logs) console.error(log)
  process.exit(1)
}

// Silence on success — the dev-server's `reload →` line is the
// developer-facing confirmation. Failures already print via the
// .success branches above.
