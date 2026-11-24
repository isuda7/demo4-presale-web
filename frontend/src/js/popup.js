// 메인 팝업 — 관리자 설정(popup_mode)에 따라 개별 팝업 / 슬라이드 팝업으로 노출한다.
// '오늘 하루 보지 않기'는 팝업별로 브라우저(localStorage)에 오늘 날짜(KST)를 저장한다.

const HIDE_KEY = 'xi_popup_hide';
const AUTOPLAY_MS = 5000;

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const today = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const SAFE_HREF = /^(https?:\/\/|\/|#|tel:|mailto:|\.\/)/i;
const SAFE_IMG = /^(data:image\/(webp|jpeg|png|gif);base64,|https:\/\/|\/images\/)/;

function readHidden() {
  try {
    const map = JSON.parse(localStorage.getItem(HIDE_KEY) || '{}');
    return map && typeof map === 'object' ? map : {};
  } catch { return {}; }
}
function hideToday(ids) {
  try {
    const map = readHidden();
    const d = today();
    Object.keys(map).forEach((k) => { if (map[k] !== d) delete map[k]; }); // 지난 날짜 정리
    ids.forEach((id) => { map[id] = d; });
    localStorage.setItem(HIDE_KEY, JSON.stringify(map));
  } catch { /* 저장 불가 환경에서는 이번 방문에서만 닫힘 */ }
}

/** 팝업 1개의 본문(배지·이미지·제목·내용·링크) */
const EN_LABEL = { event: 'EVENT', notice: 'NOTICE', general: 'INFORMATION' };

function contentHtml(p, { placeholder = false } = {}) {
  const link = p.linkUrl && SAFE_HREF.test(p.linkUrl) ? p.linkUrl : null;
  const img = p.image && SAFE_IMG.test(p.image) ? p.image : null;
  const media = img
    ? `<figure class="popup__media">${link ? `<a href="${esc(link)}" tabindex="-1" aria-hidden="true">` : ''}<img src="${esc(img)}" alt="" />${link ? '</a>' : ''}</figure>`
    : placeholder
      ? `<div class="popup__media popup__media--placeholder popup__media--${esc(p.type)}" aria-hidden="true"><span>${EN_LABEL[p.type] || 'NOTICE'}</span></div>`
      : '';
  return `
    ${media}
    <div class="popup__content">
      <span class="popup__badge popup__badge--${esc(p.type)}">${esc(p.typeLabel)}</span>
      <h2 class="popup__title" id="popup-title-${p.id}">${esc(p.title)}</h2>
      ${p.body ? `<p class="popup__text">${esc(p.body)}</p>` : ''}
      ${link ? `<a class="btn btn--block popup__link" href="${esc(link)}">${esc(p.linkLabel || '자세히 보기')} <span class="btn__arrow" aria-hidden="true"></span></a>` : ''}
    </div>`;
}

function footerHtml() {
  return `
    <div class="popup__foot">
      <button type="button" class="popup__today" data-act="today">오늘 하루 보지 않기</button>
      <button type="button" class="popup__close" data-act="close">닫기</button>
    </div>`;
}

function buildIndividual(items) {
  return items.map((p) => `
    <section class="popup popup--${esc(p.type)}" data-ids="${p.id}" role="dialog" aria-labelledby="popup-title-${p.id}">
      ${contentHtml(p)}
      ${footerHtml()}
    </section>`).join('');
}

function buildSlider(items) {
  return `
    <section class="popup popup--slider" data-ids="${items.map((p) => p.id).join(',')}" role="dialog" aria-roledescription="슬라이드 팝업" aria-label="공지 및 이벤트">
      <div class="popup__viewport">
        <div class="popup__track">
          ${items.map((p, i) => `
            <div class="popup__slide popup--${esc(p.type)}" role="group" aria-roledescription="슬라이드" aria-label="${i + 1} / ${items.length}" ${i ? 'aria-hidden="true"' : ''}>
              ${contentHtml(p, { placeholder: true })}
            </div>`).join('')}
        </div>
        <button type="button" class="popup__arrow popup__arrow--prev" data-act="prev" aria-label="이전 팝업">‹</button>
        <button type="button" class="popup__arrow popup__arrow--next" data-act="next" aria-label="다음 팝업">›</button>
      </div>
      <div class="popup__pager">
        ${items.map((p, i) => `<button type="button" class="popup__dot" data-go="${i}" aria-label="${i + 1}번째 팝업 보기" ${i ? '' : 'aria-current="true"'}></button>`).join('')}
        <span class="popup__count" aria-live="polite">1 / ${items.length}</span>
      </div>
      ${footerHtml()}
    </section>`;
}

function initSlider(el) {
  const track = el.querySelector('.popup__track');
  const slides = [...el.querySelectorAll('.popup__slide')];
  const dots = [...el.querySelectorAll('.popup__dot')];
  const count = el.querySelector('.popup__count');
  let idx = 0;
  let timer = null;
  const go = (n) => {
    idx = (n + slides.length) % slides.length;
    track.style.transform = `translateX(${-idx * 100}%)`;
    slides.forEach((s, i) => {
      s.setAttribute('aria-hidden', String(i !== idx));
      s.querySelectorAll('a, button').forEach((f) => { f.tabIndex = i === idx ? 0 : -1; });
    });
    dots.forEach((d, i) => (i === idx ? d.setAttribute('aria-current', 'true') : d.removeAttribute('aria-current')));
    count.textContent = `${idx + 1} / ${slides.length}`;
  };
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const stop = () => { clearInterval(timer); timer = null; };
  const play = () => { if (!reduce && !timer) timer = setInterval(() => go(idx + 1), AUTOPLAY_MS); };
  el.addEventListener('click', (e) => {
    const t = e.target.closest('[data-act], [data-go]');
    if (!t) return;
    if (t.dataset.act === 'prev') go(idx - 1);
    if (t.dataset.act === 'next') go(idx + 1);
    if (t.dataset.go) go(Number(t.dataset.go));
  });
  el.addEventListener('mouseenter', stop);
  el.addEventListener('mouseleave', play);
  el.addEventListener('focusin', stop);
  // 스와이프
  let x0 = null;
  el.querySelector('.popup__viewport').addEventListener('pointerdown', (e) => { x0 = e.clientX; });
  el.querySelector('.popup__viewport').addEventListener('pointerup', (e) => {
    if (x0 == null) return;
    const dx = e.clientX - x0;
    if (Math.abs(dx) > 40) go(idx + (dx < 0 ? 1 : -1));
    x0 = null;
  });
  el.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') go(idx + 1);
    if (e.key === 'ArrowLeft') go(idx - 1);
  });
  go(0);
  play();
  return stop;
}

export async function showPopups() {
  let data;
  try {
    const res = await fetch('/api/popups', { headers: { Accept: 'application/json' } });
    if (!res.ok) return;
    data = await res.json();
  } catch { return; }
  const preview = new URLSearchParams(location.search).get('popup') === 'preview';
  const hidden = preview ? {} : readHidden();
  const d = today();
  const items = (data.items || []).filter((p) => hidden[p.id] !== d);
  if (!items.length) return;

  const slide = data.mode === 'slide' && items.length > 1;
  const layer = document.createElement('div');
  layer.className = `popup-layer${slide ? ' popup-layer--slide' : ''}`;
  layer.setAttribute('aria-modal', 'true');
  layer.setAttribute('aria-label', '알림 팝업');
  layer.tabIndex = -1;
  layer.innerHTML = `<div class="popup-stack">${slide ? buildSlider(items) : buildIndividual(items)}</div>`;

  const lastFocus = document.activeElement;
  const stops = [];
  const closeLayer = () => {
    stops.forEach((s) => s());
    layer.remove();
    document.documentElement.classList.remove('popup-open');
    document.removeEventListener('keydown', onKey);
    lastFocus?.focus?.();
  };
  const closePopup = (popup, rememberToday) => {
    if (rememberToday) hideToday(popup.dataset.ids.split(','));
    popup.remove();
    const next = layer.querySelector('.popup');
    if (next) { next.tabIndex = -1; next.focus({ preventScroll: true }); }
    else closeLayer();
  };
  const onKey = (e) => {
    if (e.key === 'Escape') { closeLayer(); return; }
    if (e.key !== 'Tab') return;
    // 팝업이 열려 있는 동안 Tab 포커스를 레이어 안에 가둔다
    const f = [...layer.querySelectorAll('a[href], button')].filter((el) => el.tabIndex !== -1 && el.offsetParent !== null);
    if (!f.length) return;
    const first = f[0];
    const last = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || !layer.contains(document.activeElement) || document.activeElement === layer)) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && (document.activeElement === last || !layer.contains(document.activeElement))) {
      e.preventDefault(); first.focus();
    }
  };

  layer.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    const popup = e.target.closest('.popup');
    if (act === 'close' && popup) closePopup(popup, false);
    if (act === 'today' && popup) closePopup(popup, true);
  });
  document.addEventListener('keydown', onKey);
  document.body.append(layer);
  document.documentElement.classList.add('popup-open');
  if (slide) stops.push(initSlider(layer.querySelector('.popup--slider')));
  layer.focus({ preventScroll: true }); // Tab 한 번이면 첫 버튼으로 이동
}
