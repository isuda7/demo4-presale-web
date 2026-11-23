import { createClient } from '@libsql/client';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { SCHEMA, DEFAULT_SETTINGS } from './schema.js';

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
    })().catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  return schemaReady;
}
