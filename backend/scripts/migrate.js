// 스키마 생성/보장. 로컬 파일 DB 또는 TURSO_DATABASE_URL 대상.
import { ensureSchema } from '../src/db.js';

await ensureSchema();
console.log('migrate: OK');
