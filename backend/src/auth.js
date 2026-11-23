import { createHash, timingSafeEqual } from 'node:crypto';
import { sign, verify } from 'hono/jwt';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { db } from './db.js';

export const AUTH_COOKIE = 'xi_admin';
/** HttpOnly가 아닌 표시용 쿠키. 값은 비밀이 아니며, 편집기 로딩 여부 판단(서버 재검증 필수)에만 쓰인다. */
export const UI_COOKIE = 'xi_admin_ui';

const TOKEN_TTL_SEC = 60 * 60 * 8; // 8시간
const MAX_FAILS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function secret() {
  const s = process.env.ADMIN_TOKEN_SECRET;
  if (!s || s.length < 32) {
    throw new Error('ADMIN_TOKEN_SECRET 환경변수(32자 이상)가 필요합니다.');
  }
  return s;
}

function adminPassword() {
  const p = process.env.ADMIN_PASSWORD;
  if (!p) throw new Error('ADMIN_PASSWORD 환경변수가 필요합니다.');
  return p;
}

const digest = (v) => createHash('sha256').update(String(v), 'utf8').digest();

export function passwordMatches(input) {
  return timingSafeEqual(digest(input ?? ''), digest(adminPassword()));
}

export function clientIp(c) {
  const fwd = c.req.header('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return c.req.header('x-real-ip') || 'local';
}

export async function tooManyAttempts(ip) {
  const since = Date.now() - WINDOW_MS;
  const r = await db().execute({
    sql: 'SELECT COUNT(*) AS n FROM login_attempts WHERE ip = ? AND at > ?',
    args: [ip, since],
  });
  return Number(r.rows[0].n) >= MAX_FAILS;
}

export async function recordFail(ip) {
  await db().batch(
    [
      { sql: 'INSERT INTO login_attempts (ip, at) VALUES (?, ?)', args: [ip, Date.now()] },
      { sql: 'DELETE FROM login_attempts WHERE at < ?', args: [Date.now() - WINDOW_MS] },
    ],
    'write',
  );
}

export async function clearFails(ip) {
  await db().execute({ sql: 'DELETE FROM login_attempts WHERE ip = ?', args: [ip] });
}

function isSecure(c) {
  const proto = c.req.header('x-forwarded-proto') || new URL(c.req.url).protocol.replace(':', '');
  return proto === 'https';
}

export async function issueSession(c) {
  const now = Math.floor(Date.now() / 1000);
  const token = await sign({ sub: 'admin', iat: now, exp: now + TOKEN_TTL_SEC }, secret(), 'HS256');
  const base = { path: '/', sameSite: 'Strict', secure: isSecure(c), maxAge: TOKEN_TTL_SEC };
  setCookie(c, AUTH_COOKIE, token, { ...base, httpOnly: true });
  setCookie(c, UI_COOKIE, '1', { ...base, httpOnly: false });
  return now + TOKEN_TTL_SEC;
}

export function clearSession(c) {
  deleteCookie(c, AUTH_COOKIE, { path: '/' });
  deleteCookie(c, UI_COOKIE, { path: '/' });
}

export async function readSession(c) {
  const token = getCookie(c, AUTH_COOKIE);
  if (!token) return null;
  try {
    return await verify(token, secret(), 'HS256');
  } catch {
    return null;
  }
}

/** 관리자 전용 라우트 미들웨어: 토큰을 서버에서 검증한다. */
export async function requireAdmin(c, next) {
  const session = await readSession(c);
  if (!session) {
    clearSession(c);
    return c.json({ ok: false, code: 'UNAUTHORIZED', message: '관리자 로그인이 필요합니다.' }, 401);
  }
  c.set('admin', session);
  await next();
}
