// 핵심 콘텐츠를 HTML 문자열로 만든다(DOM 없음).
// 빌드할 때 Vite 플러그인이 이 함수로 정적 HTML을 미리 만들어 넣는다.
// JavaScript를 실행하지 않는 검색·AI 크롤러도 면적표·평면 정보·유의사항을 읽을 수 있게 하려는 것이다.

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const typeLabel = (u) => `${u.label}㎡${u.suffix}`;

export function notesListHtml(list = []) {
  return list.map((t) => `<li>${esc(t)}</li>`).join('');
}

export function summaryTableHtml(units) {
  const sum = (d) => units.reduce((a, u) => a + (u.blocks.find((b) => b.danji === d)?.households || 0), 0);
  const cell = (u, d) => u.blocks.find((b) => b.danji === d)?.households ?? '-';
  return `
    <table class="table unit-summary">
      <caption class="sr-only">타입별 단지 세대수</caption>
      <thead><tr><th scope="col">구분</th><th scope="col">1단지</th><th scope="col">2단지</th></tr></thead>
      <tbody>${units.map((u) => `<tr><th scope="row"><span class="type-chip" style="--chip:${u.color}">${typeLabel(u)}</span></th><td>${cell(u, '1단지')}</td><td>${cell(u, '2단지')}</td></tr>`).join('')}</tbody>
      <tfoot><tr><th scope="row">합계</th><td>${sum('1단지')}</td><td>${sum('2단지')}</td></tr></tfoot>
    </table>`;
}

export function unitTabsHtml(units) {
  return units.map((u, i) => `
    <button class="tab" role="tab" id="tab-${u.id}" aria-controls="panel-${u.id}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">
      ${u.label}<sup>㎡</sup>${u.suffix}
    </button>`).join('');
}

export function unitPanelsHtml(units, notes) {
  return units.map((u, i) => `
    <article class="unit-panel" role="tabpanel" id="panel-${u.id}" aria-labelledby="tab-${u.id}" ${i === 0 ? '' : 'hidden'}>
      <div class="unit-panel__head">
        <h3 class="unit-panel__type"><b>${u.label}</b><sup>㎡</sup>${u.suffix}<span class="sr-only"> 타입</span></h3>
        <div class="unit-panel__meta">
          ${u.blocks.map((b) => `
            <p class="hh"><span class="unit-panel__swatch" style="background:${u.color}"></span>${b.danji} <span>${b.households}세대</span></p>
            <p class="unit-panel__area">[${b.danji}] 전용면적 ${b.exclusive}㎡ | 공급면적 ${b.supply}㎡ | 계약면적 ${b.contract}㎡</p>`).join('')}
        </div>
        <a class="btn btn--outline btn--sm" style="margin-left:auto" href="/apply.html?type=${encodeURIComponent(u.label + u.suffix)}">이 타입 관심등록</a>
      </div>
      <div class="unit-panel__body">
        <div class="plan-box">
          <h4>확장형(별도계약)</h4>
          <div class="media media--zoom" data-lightbox="/images/unit-${u.id}-basic.webp" data-caption="${typeLabel(u)} 확장형 평면">
            <img src="/images/unit-${u.id}-basic.webp" alt="${typeLabel(u)} 확장형 단위세대 평면도" loading="lazy" />
          </div>
        </div>
        <div class="plan-box">
          <h4>유상옵션</h4>
          <div class="media media--zoom" data-lightbox="/images/unit-${u.id}-option.webp" data-caption="${typeLabel(u)} 유상옵션 평면">
            <img src="/images/unit-${u.id}-option.webp" alt="${typeLabel(u)} 유상옵션(인테리어·주방 Style Up 등) 적용 평면도" loading="lazy" />
          </div>
        </div>
      </div>
      <details class="notes"><summary>${typeLabel(u)} 평면 유의사항</summary>
        <ul>${notesListHtml(notes[u.page])}</ul>
      </details>
    </article>`).join('');
}

/** FAQ 목록 HTML (질문은 h3, 답은 문단) */
export function faqHtml(faq) {
  return faq.map((f, i) => `
    <details class="faq-item"${i < 3 ? ' open' : ''}>
      <summary><h3 class="faq-item__q"><span class="faq-item__mark" aria-hidden="true">Q</span>${esc(f.q)}</h3></summary>
      <div class="faq-item__a"><span class="faq-item__mark faq-item__mark--a" aria-hidden="true">A</span><div>${f.a.map((p) => `<p>${esc(p)}</p>`).join('')}${f.link ? `<a class="faq-item__link" href="${esc(f.link.href)}">${esc(f.link.label)} <span class="btn__arrow" aria-hidden="true"></span></a>` : ''}</div></div>
    </details>`).join('');
}
