import AOS from 'aos';
import { assignKeys, loadContent } from './content.js';

export function toast(message, kind = 'info', ms = 2600) {
  let wrap = document.querySelector('.toast-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = 'toast-wrap';
    wrap.setAttribute('role', 'status');
    wrap.setAttribute('aria-live', 'polite');
    document.body.append(wrap);
  }
  const t = document.createElement('div');
  t.className = `toast${kind === 'error' ? ' toast--error' : ''}`;
  t.textContent = message;
  wrap.append(t);
  setTimeout(() => t.remove(), ms);
}

function initHeader() {
  const header = document.getElementById('siteHeader');
  if (!header) return;
  const solidAlways = header.classList.contains('site-header--solid');
  const onScroll = () => header.classList.toggle('is-solid', solidAlways || window.scrollY > 40 || document.body.classList.contains('menu-open'));
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const toggle = header.querySelector('.menu-toggle');
  const setOpen = (open) => {
    document.body.classList.toggle('menu-open', open);
    toggle?.setAttribute('aria-expanded', String(open));
    toggle?.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
    onScroll();
  };
  toggle?.addEventListener('click', () => setOpen(!document.body.classList.contains('menu-open')));
  header.querySelectorAll('.gnb a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });

  // 현재 메뉴 페이지 표시 (헤더 GNB)
  const page = document.body.dataset.page;
  document.querySelectorAll('[data-menu]').forEach((a) => {
    const on = a.dataset.menu === page;
    a.classList.toggle('is-active', on);
    if (on) a.setAttribute('aria-current', 'page');
  });
}

/** AOS 초기화 — 대상·값은 partials/aos-setup.html(window.XI_AOS)에서 부여된다. */
function initAos() {
  const c = window.XI_AOS;
  if (!c || !document.documentElement.classList.contains('aos-on')) return;
  AOS.init({ offset: c.offset, duration: c.duration, easing: c.easing, once: c.once });
  // 등장이 끝나면 AOS 속성을 걷어내 버튼·카드의 기존 hover 전환이 덮이지 않게 한다.
  document.addEventListener('transitionend', (e) => {
    const el = e.target;
    if (e.propertyName !== 'opacity' || !el.classList?.contains('aos-animate')) return;
    ['data-aos', 'data-aos-delay'].forEach((a) => el.removeAttribute(a));
  });
  // 탭 전환·동적 렌더링 등으로 높이가 바뀌면 위치 재계산
  window.addEventListener('load', () => AOS.refresh());
  document.addEventListener('click', (e) => { if (e.target.closest('[role=tab], details > summary')) requestAnimationFrame(() => AOS.refresh()); });
}

function initLightbox() {
  const box = document.getElementById('lightbox');
  if (!box) return;
  const img = box.querySelector('img');
  const cap = box.querySelector('.lightbox__cap');
  let last = null;
  const close = () => { box.classList.remove('is-open'); document.body.style.overflow = ''; last?.focus(); };
  document.addEventListener('click', (e) => {
    const trg = e.target.closest('[data-lightbox]');
    if (!trg || document.body.classList.contains('is-editing')) return;
    last = trg;
    img.src = trg.dataset.lightbox;
    img.alt = trg.querySelector('img')?.alt || '';
    cap.textContent = trg.dataset.caption || '';
    box.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    box.querySelector('.modal__close').focus();
  });
  document.querySelectorAll('[data-lightbox]').forEach((el) => {
    el.tabIndex = 0;
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', `${el.dataset.caption || '이미지'} 크게 보기`);
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); } });
  });
  box.addEventListener('click', (e) => { if (e.target === box || e.target.closest('.modal__close')) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && box.classList.contains('is-open')) close(); });
}

const hasAdminHint = () => document.cookie.split(';').some((c) => c.trim() === 'xi_admin_ui=1');

/** 관리자 세션이 서버에서 확인될 때만 편집기 청크를 동적으로 불러온다. */
export async function maybeLoadEditor() {
  if (!hasAdminHint()) return;
  try {
    const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
    if (!res.ok) return;
    const { mountEditor } = await import('./editor/editor.js');
    mountEditor();
  } catch {
    /* 방문자 화면에는 영향 없음 */
  }
}

export async function initSite() {
  document.documentElement.classList.remove('no-js');
  initHeader();
  initAos();
  initLightbox();
  assignKeys();
  await loadContent();
  maybeLoadEditor();
}
