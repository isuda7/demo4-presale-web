// 로컬 개발 서버 — Vercel에서는 api/index.js가 같은 app을 실행한다.
import { serve } from '@hono/node-server';
import app from './app.js';

const port = Number(process.env.API_PORT || 8787);

for (const key of ['ADMIN_PASSWORD', 'ADMIN_TOKEN_SECRET']) {
  if (!process.env[key]) console.warn(`[warn] ${key} 환경변수가 없습니다. .env.example을 참고해 .env를 만들어 주세요.`);
}

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[api] http://localhost:${info.port}/api  (DB: ${process.env.TURSO_DATABASE_URL ? 'TURSO_DATABASE_URL' : 'local file backend/data/local.db'})`);
});
