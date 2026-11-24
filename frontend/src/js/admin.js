import { toast } from './site.js';

const UNIT_TYPES = ['59', '63', '74', '84A', '84B', '84C', '84D', '84E', '99', '115P'];
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const view = { login: $('#loginView'), admin: $('#adminView') };
const state = { page: 1, size: 20, statuses: {}, items: [], selected: new Set(), filters: {} };

async function api(url, opts = {}) {
  const res = await fetch(url, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    ...opts,
  });
  if (res.status === 401 && !url.endsWith('/auth/login')) {
    showLogin('세션이 만료되었습니다. 다시 로그인해 주세요.');
    throw new Error('unauthorized');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || '요청에 실패했습니다.');
    err.status = res.status;
    throw err;
  }
  return data;
}

/* ---------- auth ---------- */
function showLogin(msg = '') {
  view.admin.hidden = true;
  view.login.hidden = false;
  $('#loginError').textContent = msg;
  $('#password').value = '';
  $('#password').focus();
}

async function showAdmin() {
  view.login.hidden = true;
  view.admin.hidden = false;
  await Promise.all([loadSettings(), loadList()]);
}

$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('[type=submit]');
  btn.disabled = true;
  $('#loginError').textContent = '';
  try {
    await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ password: $('#password').value }) });
    await showAdmin();
  } catch (err) {
    $('#loginError').textContent = err.message;
  } finally {
    btn.disabled = false;
  }
});

$('#logoutBtn').addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
  showLogin('로그아웃되었습니다.');
});

/* ---------- settings (마감 스위치) ---------- */
function renderClosing(s) {
  $('#closeSwitch').checked = s.applyClosed;
  $('#closeState').textContent = s.applyClosed ? '마감됨' : '접수중';
  $('.closing').classList.toggle('is-closed', s.applyClosed);
  $('#closedTitle').value = s.closedTitle;
  $('#closedMessage').value = s.closedMessage;
}

async function loadSettings() {
  renderClosing(await api('/api/admin/settings'));
}

$('#closeSwitch').addEventListener('change', async (e) => {
  const want = e.target.checked;
  const msg = want ? '신청을 마감할까요? 신청 화면에 안내만 표시되고 새 신청은 거부됩니다.' : '신청 접수를 다시 시작할까요?';
  if (!confirm(msg)) { e.target.checked = !want; return; }
  try {
    renderClosing(await api('/api/admin/settings', { method: 'PUT', body: JSON.stringify({ applyClosed: want }) }));
    toast(want ? '신청이 마감되었습니다.' : '신청 접수를 재개했습니다.');
  } catch (err) {
    e.target.checked = !want;
    toast(err.message, 'error');
  }
});

$('#saveClosedText').addEventListener('click', async () => {
  try {
    renderClosing(await api('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify({ closedTitle: $('#closedTitle').value.trim(), closedMessage: $('#closedMessage').value.trim() }),
    }));
    toast('마감 안내 문구를 저장했습니다.');
  } catch (err) { toast(err.message, 'error'); }
});

/* ---------- list ---------- */
const form = $('#filterForm');
UNIT_TYPES.forEach((t) => form.elements.unitType.add(new Option(t, t)));

function readFilters() {
  const f = form.elements;
  return { q: f.q.value.trim(), status: f.status.value, unitType: f.unitType.value, from: f.from.value, to: f.to.value };
}

function qs(extra = {}) {
  const p = new URLSearchParams();
  Object.entries({ ...state.filters, ...extra }).forEach(([k, v]) => { if (v !== '' && v != null) p.set(k, v); });
  return p.toString();
}

function renderStats(counts, total) {
  const all = Object.values(counts).reduce((a, b) => a + b, 0);
  const cards = [['', '전체', all], ...Object.entries(state.statuses).map(([k, label]) => [k, label, counts[k] || 0])];
  $('#stats').innerHTML = cards.map(([k, label, n]) => `
    <button type="button" class="stat ${state.filters.status === k ? 'is-active' : ''}" data-status="${k}">
      <dl><dt>${label}</dt><dd>${n.toLocaleString()}</dd></dl>
    </button>`).join('');
}

function badge(status) {
  return `<span class="badge badge--${status}">${esc(state.statuses[status] || status)}</span>`;
}

function renderRows() {
  const tbody = $('#rows');
  if (!state.items.length) {
    tbody.innerHTML = '<tr><td colspan="11" class="empty">조건에 맞는 신청 내역이 없습니다.</td></tr>';
    return;
  }
  const opts = (cur) => Object.entries(state.statuses).map(([k, l]) => `<option value="${k}" ${k === cur ? 'selected' : ''}>${l}</option>`).join('');
  tbody.innerHTML = state.items.map((a) => `
    <tr data-id="${a.id}">
      <td><input type="checkbox" class="row-check" value="${a.id}" ${state.selected.has(a.id) ? 'checked' : ''} aria-label="${esc(a.name)} 선택" /></td>
      <td>${a.id}</td>
      <td>${esc(a.createdAt.slice(0, 16))}</td>
      <td><strong>${esc(a.name)}</strong></td>
      <td><a href="tel:${esc(a.phone)}">${esc(a.phone)}</a></td>
      <td>${esc(a.unitType)}</td>
      <td>${esc(a.visitDate || '-')}</td>
      <td class="td-msg"><p>${esc(a.message || '-')}</p>${a.memo ? `<p class="memo">${esc(a.memo)}</p>` : ''}</td>
      <td>${a.agreeMarketing ? 'Y' : 'N'}</td>
      <td><label class="sr-only" for="st-${a.id}">상태</label><select class="select status-select" id="st-${a.id}">${opts(a.status)}</select></td>
      <td><div class="row-actions"><button type="button" class="link-btn" data-act="detail">상세</button><button type="button" class="link-btn link-btn--danger" data-act="delete">삭제</button></div></td>
    </tr>`).join('');
}

function renderPager(total) {
  const pages = Math.max(1, Math.ceil(total / state.size));
  const cur = state.page;
  const start = Math.max(1, Math.min(cur - 4, pages - 9));
  const end = Math.min(pages, start + 9);
  let html = `<button type="button" data-page="${cur - 1}" ${cur === 1 ? 'disabled' : ''} aria-label="이전 페이지">‹</button>`;
  for (let p = start; p <= end; p++) html += `<button type="button" data-page="${p}" ${p === cur ? 'aria-current="page"' : ''}>${p}</button>`;
  html += `<button type="button" data-page="${cur + 1}" ${cur === pages ? 'disabled' : ''} aria-label="다음 페이지">›</button>`;
  $('#pager').innerHTML = html;
}

function syncSelection() {
  const checks = [...document.querySelectorAll('.row-check')];
  $('#checkAll').checked = checks.length > 0 && checks.every((c) => c.checked);
  $('#bulkDelete').disabled = state.selected.size === 0;
  $('#bulkDelete').textContent = state.selected.size ? `선택 삭제 (${state.selected.size})` : '선택 삭제';
}

async function loadList() {
  const data = await api(`/api/admin/applications?${qs({ page: state.page, size: state.size })}`);
  state.statuses = data.statuses;
  state.items = data.items;
  if (form.elements.status.options.length === 1) Object.entries(data.statuses).forEach(([k, l]) => form.elements.status.add(new Option(l, k)));
  const pages = Math.max(1, Math.ceil(data.total / state.size));
  if (state.page > pages && data.total > 0) { state.page = pages; return loadList(); }
  renderStats(data.counts, data.total);
  renderRows();
  renderPager(data.total);
  $('#resultCount').innerHTML = `조회 결과 <b>${data.total.toLocaleString()}</b>건`;
  $('#csvBtn').href = `/api/admin/applications.csv?${qs()}`;
  syncSelection();
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  state.filters = readFilters();
  state.page = 1;
  state.selected.clear();
  loadList().catch((err) => toast(err.message, 'error'));
});
form.addEventListener('reset', () => setTimeout(() => form.requestSubmit(), 0));

form.querySelector('.quick').addEventListener('click', (e) => {
  const r = e.target.closest('[data-range]')?.dataset.range;
  if (r == null) return;
  const day = (offset) => new Date(Date.now() + 9 * 3600e3 - offset * 86400e3).toISOString().slice(0, 10);
  if (r === 'all') { form.elements.from.value = ''; form.elements.to.value = ''; }
  else { form.elements.from.value = day(Number(r) === 0 ? 0 : Number(r) - 1); form.elements.to.value = day(0); }
  form.requestSubmit();
});

$('#stats').addEventListener('click', (e) => {
  const b = e.target.closest('[data-status]');
  if (!b) return;
  form.elements.status.value = b.dataset.status;
  form.requestSubmit();
});

$('#pageSize').addEventListener('change', (e) => {
  state.size = Number(e.target.value);
  state.page = 1;
  loadList();
});

$('#pager').addEventListener('click', (e) => {
  const b = e.target.closest('[data-page]');
  if (!b || b.disabled) return;
  state.page = Number(b.dataset.page);
  loadList();
});

$('#checkAll').addEventListener('change', (e) => {
  document.querySelectorAll('.row-check').forEach((c) => {
    c.checked = e.target.checked;
    const id = Number(c.value);
    if (c.checked) state.selected.add(id); else state.selected.delete(id);
  });
  syncSelection();
});

async function deleteIds(ids) {
  if (!ids.length) return;
  if (!confirm(`${ids.length}건을 삭제할까요? 삭제한 신청 내역은 복구할 수 없습니다.`)) return;
  try {
    const r = await api('/api/admin/applications', { method: 'DELETE', body: JSON.stringify({ ids }) });
    ids.forEach((id) => state.selected.delete(id));
    toast(`${r.deleted}건 삭제되었습니다.`);
    await loadList();
  } catch (err) { toast(err.message, 'error'); }
}

$('#bulkDelete').addEventListener('click', () => deleteIds([...state.selected]));

$('#rows').addEventListener('change', async (e) => {
  const tr = e.target.closest('tr[data-id]');
  if (!tr) return;
  const id = Number(tr.dataset.id);
  if (e.target.classList.contains('row-check')) {
    if (e.target.checked) state.selected.add(id); else state.selected.delete(id);
    syncSelection();
  }
  if (e.target.classList.contains('status-select')) {
    try {
      await api(`/api/admin/applications/${id}`, { method: 'PATCH', body: JSON.stringify({ status: e.target.value }) });
      toast(`상태를 '${state.statuses[e.target.value]}'(으)로 변경했습니다.`);
      await loadList();
    } catch (err) { toast(err.message, 'error'); }
  }
});

/* ---------- 상세 / 메모 ---------- */
const modal = $('#memoModal');
let current = null;
function openDetail(a) {
  current = a;
  $('#memoDetail').innerHTML = [
    ['신청번호', a.id], ['신청일시', a.createdAt], ['이름', a.name], ['연락처', a.phone], ['관심타입', a.unitType],
    ['방문희망일', a.visitDate || '-'], ['마케팅 동의', a.agreeMarketing ? '동의' : '미동의'], ['상태', state.statuses[a.status]], ['문의내용', a.message || '-'],
  ].map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('');
  $('#memoText').value = a.memo || '';
  modal.classList.add('is-open');
  $('#memoText').focus();
}
const closeModal = () => modal.classList.remove('is-open');
modal.addEventListener('click', (e) => { if (e.target === modal || e.target.closest('[data-close]')) closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
$('#memoForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await api(`/api/admin/applications/${current.id}`, { method: 'PATCH', body: JSON.stringify({ memo: $('#memoText').value }) });
    toast('메모를 저장했습니다.');
    closeModal();
    await loadList();
  } catch (err) { toast(err.message, 'error'); }
});

$('#rows').addEventListener('click', (e) => {
  const act = e.target.closest('[data-act]')?.dataset.act;
  const tr = e.target.closest('tr[data-id]');
  if (!act || !tr) return;
  const a = state.items.find((x) => x.id === Number(tr.dataset.id));
  if (act === 'detail') openDetail(a);
  if (act === 'delete') deleteIds([a.id]);
});

/* ---------- boot ---------- */
(async () => {
  const res = await fetch('/api/auth/me', { credentials: 'same-origin' }).catch(() => null);
  if (res && res.ok) showAdmin().catch((err) => toast(err.message, 'error'));
  else showLogin();
})();
