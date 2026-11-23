// 방문자/관리자 공통: 편집 가능 영역에 키를 부여하고, 저장된 편집 내용을 반영한다.
// (편집 UI 코드는 여기 없음 — editor/ 청크는 관리자 확인 후에만 동적 로드)

const originals = new Map();

export function editType(el) {
  if (el.dataset.editType) return el.dataset.editType;
  if (el.tagName === 'IMG') return 'image';
  if (el.tagName === 'A' || el.tagName === 'BUTTON') return 'button';
  return 'text';
}

/** data-edit 요소에 고유 키를 부여한다. 값이 비어 있으면 페이지.섹션.순번으로 자동 생성. */
export function assignKeys(root = document) {
  const page = document.body.dataset.page || 'page';
  const counters = new Map();
  root.querySelectorAll('[data-edit]').forEach((el) => {
    let key = el.getAttribute('data-edit');
    if (!key) {
      const scope = el.closest('section[id], header[id], footer, [data-edit-scope]');
      const scopeId = scope ? scope.id || scope.dataset.editScope || scope.tagName.toLowerCase() : 'root';
      const n = (counters.get(scopeId) || 0) + 1;
      counters.set(scopeId, n);
      key = `${page}.${scopeId}.${n}`;
    }
    el.dataset.editKey = key;
    if (!originals.has(key)) originals.set(key, snapshot(el));
  });
}

export function snapshot(el) {
  const type = editType(el);
  if (type === 'image') return { type, value: { src: el.getAttribute('src'), alt: el.getAttribute('alt') || '' } };
  if (type === 'button') return { type, value: { text: buttonText(el), href: el.getAttribute('href') } };
  return { type, value: el.innerHTML };
}

export const getOriginal = (key) => originals.get(key);

export function buttonText(el) {
  return [...el.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE).map((n) => n.textContent).join('').trim();
}

const ALLOWED = new Set(['B', 'STRONG', 'EM', 'I', 'SMALL', 'BR', 'SUP', 'SUB', 'SPAN']);
const BLOCK = new Set(['DIV', 'P', 'LI']);

/** 허용 태그만 남기고 모든 속성을 제거한다 (XSS 방지 — 렌더 시점에 항상 적용). */
export function sanitizeHtml(html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = String(html ?? '');
  const walk = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) return;
      if (child.nodeType !== Node.ELEMENT_NODE) { child.remove(); return; }
      walk(child);
      if (ALLOWED.has(child.tagName)) {
        [...child.attributes].forEach((a) => child.removeAttribute(a.name));
      } else {
        const frag = document.createDocumentFragment();
        if (BLOCK.has(child.tagName) && child.previousSibling) frag.append(document.createElement('br'));
        frag.append(...child.childNodes);
        child.replaceWith(frag);
      }
    });
  };
  walk(tpl.content);
  return tpl.innerHTML.replace(/(<br>\s*){3,}/g, '<br><br>').trim();
}

export function applyItem(el, item) {
  if (!item) return;
  const { type, value } = item;
  if (type === 'text' && typeof value === 'string') {
    el.innerHTML = sanitizeHtml(value);
  } else if (type === 'button' && value) {
    [...el.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE).forEach((n) => n.remove());
    el.prepend(document.createTextNode(`${value.text ?? ''} `));
    if (value.href && el.tagName === 'A' && /^(https?:\/\/|\/|#|tel:|mailto:|\.\/)/i.test(value.href)) {
      el.setAttribute('href', value.href);
    }
  } else if (type === 'image' && value && typeof value.src === 'string') {
    if (/^(data:image\/(webp|jpeg|png|gif);base64,|https:\/\/|\/images\/)/.test(value.src)) {
      el.removeAttribute('srcset');
      el.setAttribute('src', value.src);
      const zoom = el.closest('[data-lightbox]');
      if (zoom) zoom.dataset.lightbox = value.src;
    }
    if (typeof value.alt === 'string' && value.alt) el.setAttribute('alt', value.alt);
  }
}

export async function loadContent() {
  try {
    const res = await fetch('/api/content', { headers: { Accept: 'application/json' } });
    if (!res.ok) return {};
    const data = await res.json();
    const items = data.items || {};
    document.querySelectorAll('[data-edit-key]').forEach((el) => applyItem(el, items[el.dataset.editKey]));
    return items;
  } catch {
    return {};
  }
}
