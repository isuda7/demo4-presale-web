import { defineConfig, loadEnv } from 'vite';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { seoPlugin } from './build/seo-plugin.js';

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

/** 운영 주소: SITE_URL → Vercel 운영 도메인 → 로컬 미리보기 순 (사이트맵·canonical·llms.txt 기준) */
function resolveSiteUrl(env) {
  const url = env.SITE_URL || (env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : '');
  if (url) return url.replace(/\/+$/, '');
  console.warn('[seo] SITE_URL이 없어 http://localhost:4173 을 기준 주소로 씁니다. 운영 배포 전 SITE_URL을 설정하세요.');
  return 'http://localhost:4173';
}

/** 검색엔진 소유 확인 코드 — Vercel 환경변수에 넣으면 메인 페이지에 메타태그로 들어간다 */
const seoOptions = (env) => ({
  siteUrl: resolveSiteUrl(env),
  // 검색 노출 스위치: SEARCH_INDEXING=off 이면 모든 페이지 noindex + AI 크롤러 차단 + 사이트맵·llms.txt 미생성
  indexing: String(env.SEARCH_INDEXING ?? 'on').toLowerCase() !== 'off',
  verification: { google: env.GOOGLE_SITE_VERIFICATION, naver: env.NAVER_SITE_VERIFICATION, bing: env.BING_SITE_VERIFICATION },
});

export default defineConfig(({ mode }) => ({
  root,
  publicDir: resolve(root, 'public'),
  plugins: [htmlIncludes(), seoPlugin({ root, ...seoOptions({ ...loadEnv(mode, resolve(root, '..'), ''), ...process.env }) })],
  server: { port: 5173, proxy: apiProxy },
  preview: { port: 4173, proxy: apiProxy },
  build: {
    outDir: resolve(root, 'dist'),
    emptyOutDir: true,
    rollupOptions: { input: pages },
  },
}));
