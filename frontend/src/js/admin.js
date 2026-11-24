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
  if (location.hash === '#popups') selectTab('popups');
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

document.getElementById('quickRange').addEventListener('click', (e) => {
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

/* ---------- 탭 (신청 관리 / 팝업 관리) ---------- */
const TAB_TITLES = { apps: '관심고객 신청 관리', popups: '메인 팝업 관리' };
let popupsLoaded = false;
function selectTab(name) {
  document.querySelectorAll('.admin-tabs [role=tab]').forEach((t) => {
    const on = t.id === `tab-${name}`;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
    document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
  });
  $('#adminTitle').textContent = TAB_TITLES[name];
  history.replaceState(null, '', name === 'popups' ? '#popups' : location.pathname);
  if (name === 'popups' && !popupsLoaded) loadPopups().catch((err) => toast(err.message, 'error'));
}
document.querySelector('.admin-tabs').addEventListener('click', (e) => {
  const t = e.target.closest('[role=tab]');
  if (t) selectTab(t.id.replace('tab-', ''));
});
document.querySelector('.admin-tabs').addEventListener('keydown', (e) => {
  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
  const next = document.querySelector('.admin-tabs [aria-selected=false]');
  selectTab(next.id.replace('tab-', ''));
  next.focus();
});

/* ---------- 팝업 관리 ---------- */
const popupState = { items: [], types: {}, editing: null, image: null };

function popupPeriod(p) {
  if (!p.startDate && !p.endDate) return '상시';
  return `${p.startDate || '제한 없음'} ~ ${p.endDate || '제한 없음'}`;
}
function popupLive(p) {
  const t = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  return p.isActive && (!p.startDate || p.startDate <= t) && (!p.endDate || p.endDate >= t);
}

function renderPopups() {
  const live = popupState.items.filter(popupLive).length;
  $('#popupSummary').textContent = `전체 ${popupState.items.length}개 · 현재 메인 노출 ${live}개`;
  const tbody = $('#popupRows');
  if (!popupState.items.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty">등록된 팝업이 없습니다. [팝업 추가]로 만들어 주세요.</td></tr>';
    return;
  }
  tbody.innerHTML = popupState.items.map((p) => `
    <tr data-id="${p.id}">
      <td>${p.sortOrder}</td>
      <td><span class="badge badge--popup-${esc(p.type)}">${esc(popupState.types[p.type] || p.type)}</span></td>
      <td>${p.image ? `<img class="popup-thumb" src="${esc(p.image)}" alt="" />` : '<span class="muted">없음</span>'}</td>
      <td class="td-msg"><p><strong>${esc(p.title)}</strong></p><p class="muted">${esc(p.body || '')}</p></td>
      <td>${esc(popupPeriod(p))}${p.isActive && !popupLive(p) ? '<br><small class="muted">기간 외</small>' : ''}</td>
      <td><label class="switch switch--sm"><input type="checkbox" class="popup-active" ${p.isActive ? 'checked' : ''} aria-label="${esc(p.title)} 노출" /></label></td>
      <td><div class="row-actions"><button type="button" class="link-btn" data-act="edit">수정</button><button type="button" class="link-btn link-btn--danger" data-act="delete">삭제</button></div></td>
    </tr>`).join('');
}

async function loadPopups() {
  const data = await api('/api/admin/popups');
  popupState.items = data.items;
  popupState.types = data.types;
  popupsLoaded = true;
  document.querySelectorAll('input[name=popupMode]').forEach((r) => { r.checked = r.value === data.mode; });
  renderPopups();
}

document.querySelectorAll('input[name=popupMode]').forEach((r) => r.addEventListener('change', async () => {
  try {
    const s = await api('/api/admin/settings', { method: 'PUT', body: JSON.stringify({ popupMode: r.value }) });
    toast(s.popupMode === 'slide' ? '슬라이드 팝업으로 변경했습니다.' : '개별 팝업으로 변경했습니다.');
  } catch (err) {
    toast(err.message, 'error');
    loadPopups();
  }
}));

$('#popupRows').addEventListener('change', async (e) => {
  if (!e.target.classList.contains('popup-active')) return;
  const id = Number(e.target.closest('tr').dataset.id);
  try {
    await api(`/api/admin/popups/${id}`, { method: 'PATCH', body: JSON.stringify({ isActive: e.target.checked }) });
    popupState.items.find((p) => p.id === id).isActive = e.target.checked;
    renderPopups();
    toast(e.target.checked ? '팝업을 노출합니다.' : '팝업 노출을 중지했습니다.');
  } catch (err) { e.target.checked = !e.target.checked; toast(err.message, 'error'); }
});

$('#popupRows').addEventListener('click', async (e) => {
  const act = e.target.closest('[data-act]')?.dataset.act;
  const tr = e.target.closest('tr[data-id]');
  if (!act || !tr) return;
  const p = popupState.items.find((x) => x.id === Number(tr.dataset.id));
  if (act === 'edit') openPopupForm(p);
  if (act === 'delete') {
    if (!confirm(`'${p.title}' 팝업을 삭제할까요? 삭제하면 복구할 수 없습니다.`)) return;
    try {
      await api(`/api/admin/popups/${p.id}`, { method: 'DELETE' });
      toast('팝업을 삭제했습니다.');
      await loadPopups();
    } catch (err) { toast(err.message, 'error'); }
  }
});

const pModal = $('#popupModal');
const pForm = $('#popupForm');
const pf = pForm.elements;
function setPreview(src) {
  popupState.image = src || null;
  const img = $('#pf-preview');
  img.hidden = !src;
  if (src) img.src = src; else img.removeAttribute('src');
}
function openPopupForm(p = null) {
  popupState.editing = p;
  pForm.reset();
  $('#pf-error').hidden = true;
  $('#popupFormTitle').textContent = p ? '팝업 수정' : '팝업 추가';
  pf.type.value = p?.type || 'event';
  pf.sortOrder.value = p?.sortOrder ?? (Math.max(0, ...popupState.items.map((x) => x.sortOrder)) + 1);
  pf.title.value = p?.title || '';
  pf.body.value = p?.body || '';
  pf.image.value = p?.image && !p.image.startsWith('data:') ? p.image : '';
  pf.linkUrl.value = p?.linkUrl || '';
  pf.linkLabel.value = p?.linkLabel || '';
  pf.startDate.value = p?.startDate || '';
  pf.endDate.value = p?.endDate || '';
  pf.isActive.checked = p ? p.isActive : true;
  setPreview(p?.image || null);
  pModal.classList.add('is-open');
  pf.title.focus();
}
const closePopupForm = () => pModal.classList.remove('is-open');
$('#addPopup').addEventListener('click', () => openPopupForm());
pModal.addEventListener('click', (e) => { if (e.target === pModal || e.target.closest('[data-close]')) closePopupForm(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePopupForm(); });

function resizeImage(file, maxW = 1200, quality = 0.85) {
  return new Promise((resolve, reject) => {
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) { reject(new Error('JPG, PNG, WEBP, GIF 파일만 가능합니다.')); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, maxW / img.naturalWidth);
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * k);
      c.height = Math.round(img.naturalHeight * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      let data = c.toDataURL('image/webp', quality);
      if (!data.startsWith('data:image/webp')) data = c.toDataURL('image/jpeg', quality);
      if (data.length > 3_000_000) reject(new Error('이미지가 너무 큽니다.')); else resolve(data);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('이미지를 읽을 수 없습니다.')); };
    img.src = url;
  });
}
$('#pf-file').addEventListener('change', async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  try { setPreview(await resizeImage(f)); pf.image.value = ''; } catch (err) { toast(err.message, 'error'); }
});
pf.image.addEventListener('input', () => setPreview(pf.image.value.trim() || null));
$('#pf-image-clear').addEventListener('click', () => { pf.image.value = ''; $('#pf-file').value = ''; setPreview(null); });

pForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = $('#pf-error');
  err.hidden = true;
  if (!pf.title.value.trim()) { err.textContent = '제목을 입력해 주세요.'; err.hidden = false; pf.title.focus(); return; }
  const body = {
    type: pf.type.value,
    sortOrder: Number(pf.sortOrder.value) || 0,
    title: pf.title.value.trim(),
    body: pf.body.value.trim(),
    image: popupState.image,
    linkUrl: pf.linkUrl.value.trim(),
    linkLabel: pf.linkLabel.value.trim(),
    startDate: pf.startDate.value || null,
    endDate: pf.endDate.value || null,
    isActive: pf.isActive.checked,
  };
  const btn = pForm.querySelector('[type=submit]');
  btn.disabled = true;
  try {
    const editing = popupState.editing;
    await api(editing ? `/api/admin/popups/${editing.id}` : '/api/admin/popups', { method: editing ? 'PUT' : 'POST', body: JSON.stringify(body) });
    closePopupForm();
    toast(editing ? '팝업을 수정했습니다.' : '팝업을 추가했습니다.');
    await loadPopups();
  } catch (e2) {
    err.textContent = e2.message;
    err.hidden = false;
  } finally { btn.disabled = false; }
});

/* ---------- boot ---------- */
(async () => {
  const res = await fetch('/api/auth/me', { credentials: 'same-origin' }).catch(() => null);
  if (res && res.ok) showAdmin().catch((err) => toast(err.message, 'error'));
  else showLogin();
})();
