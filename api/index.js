// Vercel Function 진입점 — backend/의 Hono 앱을 그대로 실행한다.
// vercel.json 이 /api/* 요청을 /api?__path=* 로 재작성하므로 원래 경로를 복원한다.
import app from '../backend/src/app.js';

async function handler(request) {
  const url = new URL(request.url);
  const path = url.searchParams.get('__path');
  if (path !== null) {
    url.searchParams.delete('__path');
    url.pathname = `/api/${path}`;
    request = new Request(url, request);
  }
  return app.fetch(request);
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
