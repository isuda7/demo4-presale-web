import { defineConfig } from 'vite';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const partialsDir = resolve(root, 'partials');

/** 메뉴별 페이지 (frontend/*.html) — 새 페이지를 추가하면 자동으로 빌드 대상에 포함된다. */
const pages = Object.fromEntries(
  readdirSync(root)
    .filter((f) => f.endsWith('.html'))
    .map((f) => [f.replace(/\.html$/, ''), resolve(root, f)]),
);

/** <!-- @include name.html --> 를 partials/name.html 내용으로 치환 (헤더·푸터 공통화) */
function htmlIncludes() {
  const include = (html, depth = 0) =>
    html.replace(/<!--\s*@include\s+([\w.-]+)\s*-->/g, (_, file) => {
      if (depth > 5) throw new Error(`include 깊이 초과: ${file}`);
      return include(readFileSync(resolve(partialsDir, file), 'utf8'), depth + 1).trimEnd();
    });
  return {
    name: 'html-includes',
    transformIndexHtml: { order: 'pre', handler: (html) => include(html) },
    handleHotUpdate({ file, server }) {
      if (file.startsWith(partialsDir)) {
        server.ws.send({ type: 'full-reload' });
        return [];
      }
    },
  };
}

const apiProxy = { '/api': { target: `http://localhost:${process.env.API_PORT || 8787}`, changeOrigin: false } };

export default defineConfig({
  root,
  publicDir: resolve(root, 'public'),
  plugins: [htmlIncludes()],
  server: { port: 5173, proxy: apiProxy },
  preview: { port: 4173, proxy: apiProxy },
  build: {
    outDir: resolve(root, 'dist'),
    emptyOutDir: true,
    rollupOptions: { input: pages },
  },
});
