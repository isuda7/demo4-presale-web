// 로컬 테스트용 샘플 신청 데이터. 운영 DB에서는 실행하지 마세요.
import { db, ensureSchema } from '../src/db.js';
import { UNIT_TYPES } from '../src/schema.js';

if (process.env.TURSO_DATABASE_URL && !process.argv.includes('--force')) {
  console.error('TURSO_DATABASE_URL이 설정되어 있습니다. 운영 DB 보호를 위해 중단합니다. (강제: --force)');
  process.exit(1);
}

await ensureSchema();
const names = ['김민준', '이서연', '박도윤', '최지우', '정하준', '강서윤', '조은우', '윤지아', '장시우', '임하은', '한유준', '오수아'];
const statuses = ['new', 'new', 'contacted', 'visited', 'contracted', 'hold'];
const stmts = names.map((name, i) => {
  const d = new Date(Date.now() + 9 * 3600e3 - i * 2.3 * 86400e3);
  const ts = d.toISOString().slice(0, 19).replace('T', ' ');
  const digits = `010${String(20000000 + i * 1234567).slice(0, 8)}`;
  const phone = `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  return {
    sql: `INSERT INTO applications (name, phone, phone_digits, unit_type, visit_date, message, agree_privacy, agree_marketing, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
    args: [name, phone, digits, UNIT_TYPES[i % UNIT_TYPES.length], null, i % 3 === 0 ? '견본주택 방문 상담을 원합니다.' : null,
      i % 2, statuses[i % statuses.length], ts, ts],
  };
});
await db().batch(stmts, 'write');
console.log(`seed: ${stmts.length}건 추가`);
