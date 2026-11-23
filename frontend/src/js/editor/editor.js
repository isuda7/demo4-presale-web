// 관리자 전용 인라인 편집기. site.js가 /api/auth/me 확인 후에만 동적 import 한다.
import './editor.css';
import { editType, sanitizeHtml, applyItem, getOriginal, buttonText } from '../content.js';
import { toast } from '../site.js';

let state = null;

const $ = (html) => {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
};

function editables() {
  return [...document.querySelectorAll('[data-edit-key]')];
}

function updateStatus() {
  if (!state) return;
  const n = state.dirty.size;
  state.status.innerHTML = n ? `저장되지 않은 변경 <b>${n}건</b>` : state.editing ? '편집할 영역을 클릭하세요' : '편집 모드가 꺼져 있습니다';
  state.saveBtn.disabled = n === 0;
  state.revertBtn.disabled = n === 0;
}

function markDirty(el, item) {
  state.dirty.set(el.dataset.editKey, { el, item });
  el.classList.add('xe-dirty');
  updateStatus();
}

/* ---------- 텍스트 ---------- */
function onTextInput(e) {
  const el = e.target.closest('[data-edit-key]');
  if (!el || editType(el) !== 'text') return;
  markDirty(el, null); // 값은 저장 시점에 읽는다
}

/* ---------- 팝오버 (버튼 / 이미지) ---------- */
function closePop() {
  state?.pop?.remove();
  if (state) state.pop = null;
}

function placePop(pop, el, evt) {
  document.body.append(pop);
  const r = evt ? { left: evt.clientX, top: evt.clientY, bottom: evt.clientY } : el.getBoundingClientRect();
  const w = pop.offsetWidth;
  let left = window.scrollX + r.left;
  left = Math.max(window.scrollX + 12, Math.min(left, window.scrollX + document.documentElement.clientWidth - w - 12));
  let top = window.scrollY + r.bottom + 10;
  if (r.bottom + pop.offsetHeight + 20 > window.innerHeight && r.top > pop.offsetHeight + 80) top = window.scrollY + r.top - pop.offsetHeight - 10;
  pop.style.left = `${left}px`;
  pop.style.top = `${top}px`;
  pop.querySelector('input, button')?.focus();
}

function resetButton(key) {
  return `<button type="button" class="xe-btn xe-pop__reset" data-act="reset" title="저장된 편집을 지우고 원래 내용으로 되돌립니다">기본값 복원</button>`;
}

function openButtonPop(el) {
  closePop();
  const key = el.dataset.editKey;
  const pop = $(`
    <form class="xe-pop" role="dialog" aria-label="버튼 편집">
      <h4>버튼 편집 <code>${key}</code></h4>
      <label>버튼 문구<input type="text" name="text" maxlength="200" required /></label>
      ${el.tagName === 'A' ? '<label>링크 주소<input type="text" name="href" maxlength="1000" placeholder="/apply.html, #unit, https://..." /></label>' : ''}
      <div class="xe-pop__row">${resetButton(key)}<button type="button" class="xe-btn" data-act="cancel">닫기</button><button class="xe-btn xe-btn--primary">적용</button></div>
    </form>`);
  pop.text.value = buttonText(el);
  if (pop.href) pop.href.value = el.getAttribute('href') || '';
  pop.addEventListener('submit', (e) => {
    e.preventDefault();
    const value = { text: pop.text.value.trim(), href: pop.href ? pop.href.value.trim() : null };
    if (value.href && !/^(https?:\/\/|\/|#|tel:|mailto:|\.\/)/i.test(value.href)) { toast('링크는 /, #, http(s)://, tel:, mailto: 로 시작해야 합니다.', 'error'); return; }
    applyItem(el, { type: 'button', value });
    markDirty(el, { type: 'button', value });
    closePop();
  });
  bindPopCommon(pop, el);
  state.pop = pop;
  placePop(pop, el);
}

function resizeImage(file, maxW = 1920, quality = 0.84) {
  return new Promise((resolve, reject) => {
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) { reject(new Error('JPG, PNG, WEBP, GIF 파일만 가능합니다.')); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxW / img.naturalWidth);
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * scale);
      c.height = Math.round(img.naturalHeight * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      let data = c.toDataURL('image/webp', quality);
      if (!data.startsWith('data:image/webp')) data = c.toDataURL('image/jpeg', quality);
      if (data.length > 3_000_000) { reject(new Error('이미지가 너무 큽니다. 더 작은 이미지를 사용해 주세요.')); return; }
      resolve(data);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('이미지를 읽을 수 없습니다.')); };
    img.src = url;
  });
}

function openImagePop(el, evt) {
  closePop();
  const key = el.dataset.editKey;
  const pop = $(`
    <form class="xe-pop" role="dialog" aria-label="이미지 편집">
      <h4>비주얼 편집 <code>${key}</code></h4>
      <img class="xe-pop__preview" alt="미리보기" />
      <label>이미지 파일 업로드<input type="file" name="file" accept="image/jpeg,image/png,image/webp,image/gif" /></label>
      <label>또는 이미지 주소<input type="text" name="src" maxlength="1000" placeholder="https://... 또는 /images/..." /></label>
      <label>대체텍스트(alt)<input type="text" name="alt" maxlength="300" /></label>
      <p class="xe-pop__hint">업로드 이미지는 가로 1920px 이하로 자동 축소되어 저장됩니다.</p>
      <div class="xe-pop__row">${resetButton(key)}<button type="button" class="xe-btn" data-act="cancel">닫기</button><button class="xe-btn xe-btn--primary">적용</button></div>
    </form>`);
  const preview = pop.querySelector('.xe-pop__preview');
  let src = el.getAttribute('src');
  preview.src = src;
  pop.src.value = src.startsWith('data:') ? '' : src;
  pop.alt.value = el.getAttribute('alt') || '';
  pop.file.addEventListener('change', async () => {
    const f = pop.file.files[0];
    if (!f) return;
    try {
      src = await resizeImage(f);
      preview.src = src;
      pop.src.value = '';
    } catch (err) { toast(err.message, 'error'); }
  });
  pop.src.addEventListener('input', () => { if (pop.src.value.trim()) { src = pop.src.value.trim(); preview.src = src; } });
  pop.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!/^(data:image\/(webp|jpeg|png|gif);base64,|https:\/\/|\/images\/)/.test(src)) { toast('업로드 파일 또는 https:// · /images/ 주소만 사용할 수 있습니다.', 'error'); return; }
    const value = { src, alt: pop.alt.value.trim() };
    applyItem(el, { type: 'image', value });
    markDirty(el, { type: 'image', value });
    closePop();
  });
  bindPopCommon(pop, el);
  state.pop = pop;
  placePop(pop, el, evt);
}

function bindPopCommon(pop, el) {
  pop.addEventListener('click', async (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'cancel') closePop();
    if (act === 'reset') {
      await resetToOriginal(el);
      closePop();
    }
  });
  pop.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closePop(); el.focus?.(); } });
}

async function resetToOriginal(el) {
  const key = el.dataset.editKey;
  if (!confirm('이 영역을 원래 내용으로 되돌릴까요? (저장된 편집이 삭제됩니다)')) return;
  const res = await api(`/api/admin/content/${encodeURIComponent(key)}`, { method: 'DELETE' });
  if (!res) return;
  const orig = getOriginal(key);
  if (orig) {
    if (orig.type === 'text') el.innerHTML = orig.value;
    else applyItem(el, orig);
  }
  state.dirty.delete(key);
  el.classList.remove('xe-dirty');
  updateStatus();
  toast('원래 내용으로 복원했습니다.');
}

/* ---------- 클릭 가로채기 ---------- */
function onClickCapture(e) {
  if (!state?.editing) return;
  if (e.target.closest('.xe-bar, .xe-pop')) return;
  const el = e.target.closest('[data-edit-key]');
  const link = e.target.closest('a, button, [data-lightbox], summary, [role=tab]');
  if (el) {
    const type = editType(el);
    if (type === 'button') { e.preventDefault(); e.stopPropagation(); openButtonPop(el); return; }
    if (type === 'image') { e.preventDefault(); e.stopPropagation(); openImagePop(el); return; }
    // 텍스트: 링크 안의 텍스트라도 이동하지 않도록
    if (link && link.tagName === 'A') e.preventDefault();
    closePop();
    return;
  }
  // 오버레이 아래 깔린 배경 비주얼(히어로 등): 빈 영역 클릭 시 배경 이미지 편집
  const bgHost = e.target.closest('[data-edit-bg]');
  const bgImg = bgHost?.querySelector('img[data-edit-key]');
  if (bgImg && !link) { e.preventDefault(); e.stopPropagation(); openImagePop(bgImg, e); return; }
  if (link && (link.tagName === 'A' || link.hasAttribute('data-lightbox'))) e.preventDefault();
  if (!e.target.closest('.xe-pop')) closePop();
}

function onKeydown(e) {
  if (!state) return;
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
}

function onPaste(e) {
  const el = e.target.closest?.('[data-edit-key]');
  if (!state?.editing || !el || editType(el) !== 'text') return;
  e.preventDefault();
  const text = e.clipboardData.getData('text/plain');
  document.execCommand('insertText', false, text);
}

function setEditing(on) {
  state.editing = on;
  document.body.classList.toggle('is-editing', on);
  state.toggleBtn.textContent = on ? '편집 종료' : '편집 시작';
  state.toggleBtn.classList.toggle('xe-btn--on', on);
  editables().forEach((el) => {
    if (editType(el) === 'text') {
      if (on) { el.setAttribute('contenteditable', 'true'); el.spellcheck = false; }
      else el.removeAttribute('contenteditable');
    } else if (on) el.setAttribute('tabindex', el.getAttribute('tabindex') ?? '0');
  });
  if (!on) closePop();
  updateStatus();
}

/* ---------- API ---------- */
async function api(url, opts = {}) {
  const res = await fetch(url, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    ...opts,
  });
  if (res.status === 401) {
    toast('관리자 세션이 만료되었습니다. 다시 로그인해 주세요.', 'error', 4000);
    unmountEditor();
    return null;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { toast(data.message || '요청에 실패했습니다.', 'error', 4000); return null; }
  return data;
}

async function save() {
  if (!state || !state.dirty.size) return;
  const items = [...state.dirty.entries()].map(([key, { el, item }]) => {
    if (item) return { key, ...item };
    return { key, type: 'text', value: sanitizeHtml(el.innerHTML) };
  });
  state.saveBtn.disabled = true;
  state.saveBtn.textContent = '저장 중…';
  const res = await api('/api/admin/content', { method: 'PUT', body: JSON.stringify({ items }) });
  if (!state) return;
  state.saveBtn.textContent = '저장';
  if (!res) { updateStatus(); return; }
  state.dirty.forEach(({ el }) => el.classList.remove('xe-dirty'));
  state.dirty.clear();
  updateStatus();
  toast(`${items.length}건 저장되었습니다. 방문자 화면에 바로 반영됩니다.`);
}

async function logout() {
  if (state?.dirty.size && !confirm('저장하지 않은 변경이 있습니다. 로그아웃할까요?')) return;
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {});
  unmountEditor();
  toast('로그아웃되었습니다.');
}

function onBeforeUnload(e) {
  if (state?.dirty.size) { e.preventDefault(); e.returnValue = ''; }
}

async function onVisibility() {
  if (document.visibilityState !== 'visible' || !state) return;
  const res = await fetch('/api/auth/me', { credentials: 'same-origin' }).catch(() => null);
  if (!res || !res.ok) unmountEditor();
}

export function mountEditor() {
  if (state) return;
  const bar = $(`
    <div class="xe-bar" role="toolbar" aria-label="관리자 편집 도구">
      <span class="xe-bar__brand"><span class="xe-bar__dot" aria-hidden="true"></span>관리자 편집</span>
      <span class="xe-bar__status" aria-live="polite"></span>
      <span class="xe-bar__spacer"></span>
      <button type="button" class="xe-btn" data-act="toggle">편집 시작</button>
      <button type="button" class="xe-btn" data-act="revert">변경 취소</button>
      <button type="button" class="xe-btn xe-btn--primary" data-act="save">저장</button>
      <a class="xe-btn xe-hide-sm" href="/admin.html">관리자 페이지</a>
      <button type="button" class="xe-btn" data-act="logout">로그아웃</button>
    </div>`);
  state = {
    bar,
    status: bar.querySelector('.xe-bar__status'),
    toggleBtn: bar.querySelector('[data-act=toggle]'),
    saveBtn: bar.querySelector('[data-act=save]'),
    revertBtn: bar.querySelector('[data-act=revert]'),
    dirty: new Map(),
    editing: false,
    pop: null,
  };
  bar.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'toggle') setEditing(!state.editing);
    if (act === 'save') save();
    if (act === 'logout') logout();
    if (act === 'revert' && confirm('저장하지 않은 변경을 모두 취소할까요?')) { state.dirty.clear(); location.reload(); }
  });
  document.body.prepend(bar);
  document.body.classList.add('has-xe-bar');
  document.addEventListener('click', onClickCapture, true);
  document.addEventListener('input', onTextInput);
  document.addEventListener('keydown', onKeydown);
  document.addEventListener('paste', onPaste);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('beforeunload', onBeforeUnload);
  updateStatus();
  if (new URLSearchParams(location.search).has('edit')) setEditing(true);
}

/** 로그아웃/세션 만료 시 편집 바와 편집 상태를 즉시 제거한다. */
export function unmountEditor() {
  if (!state) return;
  setEditing(false);
  document.querySelectorAll('.xe-dirty').forEach((el) => el.classList.remove('xe-dirty'));
  state.bar.remove();
  document.body.classList.remove('has-xe-bar', 'is-editing');
  document.removeEventListener('click', onClickCapture, true);
  document.removeEventListener('input', onTextInput);
  document.removeEventListener('keydown', onKeydown);
  document.removeEventListener('paste', onPaste);
  document.removeEventListener('visibilitychange', onVisibility);
  window.removeEventListener('beforeunload', onBeforeUnload);
  state = null;
}
