import { createClient } from '@libsql/client';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { SCHEMA, DEFAULT_SETTINGS, DEFAULT_POPUPS } from './schema.js';

let client = null;
let schemaReady = null;

/** 로컬 개발 기본 DB (Turso와 동일한 libSQL 엔진의 파일 DB) */
const LOCAL_DB_URL = 'file:backend/data/local.db';

function resolveUrl() {
  const url = process.env.TURSO_DATABASE_URL;
  if (url) return url;
  if (process.env.VERCEL) {
    throw new Error('TURSO_DATABASE_URL 환경변수가 설정되지 않았습니다.');
  }
  return LOCAL_DB_URL;
}

export function db() {
  if (!client) {
    const url = resolveUrl();
    if (url.startsWith('file:')) {
      mkdirSync(dirname(url.slice('file:'.length)), { recursive: true });
    }
    client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN || undefined });
  }
  return client;
}

/** 스키마를 한 번만 보장한다 (서버리스 콜드스타트마다 1회). */
export function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const c = db();
      await c.batch(SCHEMA, 'write');
      const stmts = Object.entries(DEFAULT_SETTINGS).map(([key, value]) => ({
        sql: 'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)',
        args: [key, value],
      }));
      await c.batch(stmts, 'write');
      // 기본 팝업: 플래그를 먼저 원자적으로 세워 동시 콜드스타트에서도 한 번만 넣는다.
      const flag = await c.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('popups_seeded', '1')");
      if (flag.rowsAffected === 1) {
        const now = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 19).replace('T', ' ');
        await c.batch(DEFAULT_POPUPS.map((p) => ({
          sql: `INSERT INTO popups (type, title, body, image, link_url, link_label, sort_order, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
          args: [p.type, p.title, p.body, p.image, p.link_url, p.link_label, p.sort_order, now, now],
        })), 'write');
      }
    })().catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  return schemaReady;
}
