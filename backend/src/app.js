import { Hono } from 'hono';
import { secureHeaders } from 'hono/secure-headers';
import { bodyLimit } from 'hono/body-limit';
import { db, ensureSchema } from './db.js';
import { STATUSES, UNIT_TYPES, POPUP_TYPES, POPUP_MODES } from './schema.js';
import {
  clientIp, passwordMatches, tooManyAttempts, recordFail, clearFails,
  issueSession, clearSession, readSession, requireAdmin,
} from './auth.js';
import { validateApplication, validateContentItem, validatePopup, nowKst, todayKst, isDate } from './validate.js';

const app = new Hono().basePath('/api');

app.use('*', secureHeaders({ crossOriginResourcePolicy: 'same-origin' }));
app.use('*', async (c, next) => {
  c.header('Cache-Control', 'no-store');
  c.header('X-Robots-Tag', 'noindex, nofollow'); // API 응답은 검색에 노출하지 않는다
  await ensureSchema();
  await next();
});

app.onError((err, c) => {
  console.error('[api error]', err);
  return c.json({ ok: false, code: 'SERVER_ERROR', message: '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' }, 500);
});
app.notFound((c) => c.json({ ok: false, code: 'NOT_FOUND', message: '요청한 API가 없습니다.' }, 404));

const limitJson = (maxSize) =>
  bodyLimit({ maxSize, onError: (c) => c.json({ ok: false, code: 'PAYLOAD_TOO_LARGE', message: '요청 크기가 너무 큽니다.' }, 413) });

async function readJson(c) {
  try {
    return await c.req.json();
  } catch {
    return null;
  }
}

async function getSettings() {
  const r = await db().execute('SELECT key, value FROM settings');
  const s = Object.fromEntries(r.rows.map((row) => [row.key, row.value]));
  return {
    applyClosed: s.apply_closed === '1',
    closedTitle: s.closed_title || '',
    closedMessage: s.closed_message || '',
    popupMode: POPUP_MODES.includes(s.popup_mode) ? s.popup_mode : 'individual',
  };
}

/* ───────── 공개 API ───────── */

app.get('/health', (c) => c.json({ ok: true }));

app.get('/public/settings', async (c) => {
  const s = await getSettings();
  return c.json({ ok: true, ...s, unitTypes: UNIT_TYPES });
});

app.get('/content', async (c) => {
  const r = await db().execute('SELECT key, type, value FROM content');
  const items = {};
  for (const row of r.rows) {
    items[row.key] = { type: row.type, value: row.type === 'text' ? row.value : JSON.parse(row.value) };
  }
  return c.json({ ok: true, items });
});

app.post('/applications', limitJson(20 * 1024), async (c) => {
  const settings = await getSettings();
  if (settings.applyClosed) {
    return c.json({ ok: false, code: 'APPLICATIONS_CLOSED', title: settings.closedTitle, message: settings.closedMessage }, 403);
  }
  const body = await readJson(c);
  if (body && typeof body.website === 'string' && body.website.trim() !== '') {
    // 허니팟(봇) — 정상 응답처럼 보이게 하고 저장하지 않는다.
    return c.json({ ok: true }, 201);
  }
  const { value, errors } = validateApplication(body);
  if (errors) return c.json({ ok: false, code: 'VALIDATION', message: '입력값을 확인해 주세요.', errors }, 400);

  const dup = await db().execute({
    sql: "SELECT id FROM applications WHERE phone_digits = ? AND created_at > datetime(?, '-1 day') LIMIT 1",
    args: [value.phoneDigits, nowKst()],
  });
  if (dup.rows.length) {
    return c.json({ ok: false, code: 'DUPLICATE', message: '이미 접수된 연락처입니다. 24시간 이내 중복 신청은 할 수 없습니다.' }, 409);
  }
  const now = nowKst();
  const r = await db().execute({
    sql: `INSERT INTO applications
      (name, phone, phone_digits, unit_type, visit_date, message, agree_privacy, agree_marketing, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?)`,
    args: [value.name, value.phone, value.phoneDigits, value.unitType, value.visitDate, value.message,
      value.agreePrivacy, value.agreeMarketing, now, now],
  });
  return c.json({ ok: true, id: Number(r.lastInsertRowid) }, 201);
});

const mapPopup = (r) => ({
  id: Number(r.id),
  type: r.type,
  typeLabel: POPUP_TYPES[r.type] || r.type,
  title: r.title,
  body: r.body,
  image: r.image,
  linkUrl: r.link_url,
  linkLabel: r.link_label,
  startDate: r.start_date,
  endDate: r.end_date,
  sortOrder: Number(r.sort_order),
  isActive: Number(r.is_active) === 1,
  updatedAt: r.updated_at,
});

/** 메인 노출 팝업: 노출 중이며 기간 안에 있는 것만, 순서대로 */
app.get('/popups', async (c) => {
  const today = todayKst();
  const [rows, s] = await Promise.all([
    db().execute({
      sql: `SELECT * FROM popups WHERE is_active = 1
              AND (start_date IS NULL OR start_date <= ?) AND (end_date IS NULL OR end_date >= ?)
            ORDER BY sort_order ASC, id ASC`,
      args: [today, today],
    }),
    getSettings(),
  ]);
  return c.json({ ok: true, mode: s.popupMode, items: rows.rows.map(mapPopup) });
});

/* ───────── 인증 ───────── */

app.post('/auth/login', limitJson(4 * 1024), async (c) => {
  const ip = clientIp(c);
  if (await tooManyAttempts(ip)) {
    return c.json({ ok: false, code: 'TOO_MANY_ATTEMPTS', message: '로그인 시도가 너무 많습니다. 15분 후 다시 시도해 주세요.' }, 429);
  }
  const body = await readJson(c);
  if (!body || typeof body.password !== 'string' || !passwordMatches(body.password)) {
    await recordFail(ip);
    return c.json({ ok: false, code: 'INVALID_PASSWORD', message: '비밀번호가 올바르지 않습니다.' }, 401);
  }
  await clearFails(ip);
  const exp = await issueSession(c);
  return c.json({ ok: true, exp });
});

app.post('/auth/logout', (c) => {
  clearSession(c);
  return c.json({ ok: true });
});

app.get('/auth/me', async (c) => {
  const s = await readSession(c);
  if (!s) {
    clearSession(c);
    return c.json({ ok: false, admin: false }, 401);
  }
  return c.json({ ok: true, admin: true, exp: s.exp });
});

/* ───────── 관리자 API ───────── */

const admin = new Hono();
admin.use('*', requireAdmin);

function buildFilter(q) {
  const where = [];
  const args = [];
  const keyword = (q.q || '').trim();
  if (keyword) {
    const digits = keyword.replace(/\D/g, '');
    if (digits.length >= 3) {
      where.push('(name LIKE ? OR phone_digits LIKE ? OR message LIKE ?)');
      args.push(`%${keyword}%`, `%${digits}%`, `%${keyword}%`);
    } else {
      where.push('(name LIKE ? OR message LIKE ? OR memo LIKE ?)');
      args.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
  }
  const statuses = String(q.status || '').split(',').filter((s) => s in STATUSES);
  if (statuses.length) {
    where.push(`status IN (${statuses.map(() => '?').join(',')})`);
    args.push(...statuses);
  }
  if (q.unitType && UNIT_TYPES.includes(q.unitType)) {
    where.push('unit_type = ?');
    args.push(q.unitType);
  }
  if (isDate(q.from)) {
    where.push('created_at >= ?');
    args.push(`${q.from} 00:00:00`);
  }
  if (isDate(q.to)) {
    where.push('created_at <= ?');
    args.push(`${q.to} 23:59:59`);
  }
  return { sql: where.length ? `WHERE ${where.join(' AND ')}` : '', args };
}

const mapRow = (r) => ({
  id: Number(r.id),
  name: r.name,
  phone: r.phone,
  unitType: r.unit_type,
  visitDate: r.visit_date,
  message: r.message,
  agreeMarketing: Number(r.agree_marketing) === 1,
  status: r.status,
  memo: r.memo,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

admin.get('/applications', async (c) => {
  const q = c.req.query();
  const page = Math.max(1, parseInt(q.page, 10) || 1);
  const size = Math.min(100, Math.max(5, parseInt(q.size, 10) || 20));
  const f = buildFilter(q);
  const [list, total, counts] = await db().batch(
    [
      { sql: `SELECT * FROM applications ${f.sql} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`, args: [...f.args, size, (page - 1) * size] },
      { sql: `SELECT COUNT(*) AS n FROM applications ${f.sql}`, args: f.args },
      { sql: 'SELECT status, COUNT(*) AS n FROM applications GROUP BY status', args: [] },
    ],
    'read',
  );
  return c.json({
    ok: true,
    items: list.rows.map(mapRow),
    total: Number(total.rows[0].n),
    page,
    size,
    counts: Object.fromEntries(counts.rows.map((r) => [r.status, Number(r.n)])),
    statuses: STATUSES,
  });
});

admin.get('/applications.csv', async (c) => {
  const f = buildFilter(c.req.query());
  const r = await db().execute({ sql: `SELECT * FROM applications ${f.sql} ORDER BY created_at DESC, id DESC`, args: f.args });
  const esc = (v) => {
    let s = v == null ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // CSV 수식 주입 방지
    return `"${s.replace(/"/g, '""')}"`;
  };
  const header = ['번호', '신청일시', '이름', '연락처', '관심타입', '방문희망일', '문의내용', '마케팅동의', '상태', '관리자메모'];
  const lines = r.rows.map((row) => {
    const a = mapRow(row);
    return [a.id, a.createdAt, a.name, a.phone, a.unitType, a.visitDate, a.message, a.agreeMarketing ? 'Y' : 'N', STATUSES[a.status] || a.status, a.memo]
      .map(esc).join(',');
  });
  const csv = '﻿' + [header.map(esc).join(','), ...lines].join('\r\n');
  const stamp = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10).replace(/-/g, '');
  c.header('Content-Type', 'text/csv; charset=utf-8');
  c.header('Content-Disposition', `attachment; filename="applications_${stamp}.csv"`);
  return c.body(csv);
});

admin.patch('/applications/:id', limitJson(8 * 1024), async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  const body = (await readJson(c)) || {};
  const sets = [];
  const args = [];
  if (body.status !== undefined) {
    if (!(body.status in STATUSES)) return c.json({ ok: false, message: '상태 값이 올바르지 않습니다.' }, 400);
    sets.push('status = ?');
    args.push(body.status);
  }
  if (body.memo !== undefined) {
    if (typeof body.memo !== 'string' || body.memo.length > 1000) return c.json({ ok: false, message: '메모는 1000자 이내입니다.' }, 400);
    sets.push('memo = ?');
    args.push(body.memo.trim() || null);
  }
  if (!sets.length) return c.json({ ok: false, message: '변경할 항목이 없습니다.' }, 400);
  sets.push('updated_at = ?');
  args.push(nowKst(), id);
  const r = await db().execute({ sql: `UPDATE applications SET ${sets.join(', ')} WHERE id = ?`, args });
  if (!r.rowsAffected) return c.json({ ok: false, message: '신청 건을 찾을 수 없습니다.' }, 404);
  return c.json({ ok: true });
});

admin.delete('/applications', limitJson(64 * 1024), async (c) => {
  const body = (await readJson(c)) || {};
  const ids = Array.isArray(body.ids) ? body.ids.map((v) => parseInt(v, 10)).filter(Number.isFinite) : [];
  if (!ids.length || ids.length > 500) return c.json({ ok: false, message: '삭제할 항목을 선택해 주세요.' }, 400);
  const r = await db().execute({ sql: `DELETE FROM applications WHERE id IN (${ids.map(() => '?').join(',')})`, args: ids });
  return c.json({ ok: true, deleted: r.rowsAffected });
});

admin.get('/settings', async (c) => c.json({ ok: true, ...(await getSettings()) }));

admin.put('/settings', limitJson(8 * 1024), async (c) => {
  const body = (await readJson(c)) || {};
  const stmts = [];
  const put = (key, value) => stmts.push({ sql: 'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', args: [key, value] });
  if (typeof body.applyClosed === 'boolean') put('apply_closed', body.applyClosed ? '1' : '0');
  if (typeof body.closedTitle === 'string') put('closed_title', body.closedTitle.slice(0, 100));
  if (typeof body.closedMessage === 'string') put('closed_message', body.closedMessage.slice(0, 1000));
  if (body.popupMode !== undefined) {
    if (!POPUP_MODES.includes(body.popupMode)) return c.json({ ok: false, message: '팝업 노출 방식이 올바르지 않습니다.' }, 400);
    put('popup_mode', body.popupMode);
  }
  if (!stmts.length) return c.json({ ok: false, message: '변경할 설정이 없습니다.' }, 400);
  await db().batch(stmts, 'write');
  return c.json({ ok: true, ...(await getSettings()) });
});

admin.put('/content', limitJson(8 * 1024 * 1024), async (c) => {
  const body = (await readJson(c)) || {};
  const items = Array.isArray(body.items) ? body.items : [];
  if (!items.length || items.length > 200) return c.json({ ok: false, message: '저장할 항목이 없습니다.' }, 400);
  for (const it of items) {
    const err = validateContentItem(it);
    if (err) return c.json({ ok: false, message: `${it?.key ?? ''}: ${err}` }, 400);
  }
  const now = nowKst();
  await db().batch(
    items.map((it) => ({
      sql: `INSERT INTO content (key, type, value, updated_at) VALUES (?, ?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET type = excluded.type, value = excluded.value, updated_at = excluded.updated_at`,
      args: [it.key, it.type, it.type === 'text' ? it.value : JSON.stringify(it.value), now],
    })),
    'write',
  );
  return c.json({ ok: true, saved: items.length });
});

admin.delete('/content/:key', async (c) => {
  await db().execute({ sql: 'DELETE FROM content WHERE key = ?', args: [c.req.param('key')] });
  return c.json({ ok: true });
});

/* ---------- 팝업 관리 ---------- */
admin.get('/popups', async (c) => {
  const r = await db().execute('SELECT * FROM popups ORDER BY sort_order ASC, id ASC');
  const s = await getSettings();
  return c.json({ ok: true, mode: s.popupMode, types: POPUP_TYPES, items: r.rows.map(mapPopup) });
});

admin.post('/popups', limitJson(4 * 1024 * 1024), async (c) => {
  const { value: v, error } = validatePopup(await readJson(c));
  if (error) return c.json({ ok: false, message: error }, 400);
  const now = nowKst();
  const r = await db().execute({
    sql: `INSERT INTO popups (type, title, body, image, link_url, link_label, start_date, end_date, sort_order, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [v.type, v.title, v.body, v.image, v.linkUrl, v.linkLabel, v.startDate, v.endDate, v.sortOrder, v.isActive, now, now],
  });
  return c.json({ ok: true, id: Number(r.lastInsertRowid) }, 201);
});

admin.put('/popups/:id', limitJson(4 * 1024 * 1024), async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  const { value: v, error } = validatePopup(await readJson(c));
  if (error) return c.json({ ok: false, message: error }, 400);
  const r = await db().execute({
    sql: `UPDATE popups SET type = ?, title = ?, body = ?, image = ?, link_url = ?, link_label = ?, start_date = ?, end_date = ?,
            sort_order = ?, is_active = ?, updated_at = ? WHERE id = ?`,
    args: [v.type, v.title, v.body, v.image, v.linkUrl, v.linkLabel, v.startDate, v.endDate, v.sortOrder, v.isActive, nowKst(), id],
  });
  if (!r.rowsAffected) return c.json({ ok: false, message: '팝업을 찾을 수 없습니다.' }, 404);
  return c.json({ ok: true });
});

admin.patch('/popups/:id', limitJson(1024), async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  const body = (await readJson(c)) || {};
  if (typeof body.isActive !== 'boolean') return c.json({ ok: false, message: '노출 여부 값이 필요합니다.' }, 400);
  const r = await db().execute({ sql: 'UPDATE popups SET is_active = ?, updated_at = ? WHERE id = ?', args: [body.isActive ? 1 : 0, nowKst(), id] });
  if (!r.rowsAffected) return c.json({ ok: false, message: '팝업을 찾을 수 없습니다.' }, 404);
  return c.json({ ok: true });
});

admin.delete('/popups/:id', async (c) => {
  const r = await db().execute({ sql: 'DELETE FROM popups WHERE id = ?', args: [parseInt(c.req.param('id'), 10)] });
  return c.json({ ok: true, deleted: r.rowsAffected });
});

app.route('/admin', admin);

export default app;
