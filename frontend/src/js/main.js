import notes from '../data/notes.json';
import { UNITS } from '../data/units.js';
import { initSite } from './site.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function renderNotes() {
  document.querySelectorAll('details[data-notes]').forEach((d) => {
    const list = notes[d.dataset.notes] || [];
    if (!list.length) { d.remove(); return; }
    const ul = document.createElement('ul');
    ul.innerHTML = list.map((t) => `<li>${esc(t)}</li>`).join('');
    d.append(ul);
  });
  document.querySelectorAll('details[data-notes-list]').forEach((d) => {
    const list = notes[d.dataset.notesList] || [];
    d.querySelector('ul').innerHTML = list.map((t) => `<li>${esc(t)}</li>`).join('');
  });
}

function typeLabel(u) {
  return `${u.label}㎡${u.suffix}`;
}

function renderSummaryTable(target) {
  if (!target) return;
  const sum = (d) => UNITS.reduce((a, u) => a + (u.blocks.find((b) => b.danji === d)?.households || 0), 0);
  const cell = (u, d) => u.blocks.find((b) => b.danji === d)?.households ?? '-';
  target.innerHTML = `
    <table class="table unit-summary">
      <caption class="sr-only">타입별 단지 세대수</caption>
      <thead><tr><th scope="col">구분</th><th scope="col">1단지</th><th scope="col">2단지</th></tr></thead>
      <tbody>${UNITS.map((u) => `<tr><th scope="row"><span class="type-chip" style="--chip:${u.color}">${typeLabel(u)}</span></th><td>${cell(u, '1단지')}</td><td>${cell(u, '2단지')}</td></tr>`).join('')}</tbody>
      <tfoot><tr><th scope="row">합계</th><td>${sum('1단지')}</td><td>${sum('2단지')}</td></tr></tfoot>
    </table>`;
}

function renderUnits() {
  const tabs = document.getElementById('unitTabs');
  const panels = document.getElementById('unitPanels');
  if (!tabs || !panels) return;
  tabs.innerHTML = UNITS.map((u, i) => `
    <button class="tab" role="tab" id="tab-${u.id}" aria-controls="panel-${u.id}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">
      ${u.label}<sup>㎡</sup>${u.suffix}
    </button>`).join('');
  panels.innerHTML = UNITS.map((u, i) => `
    <article class="unit-panel" role="tabpanel" id="panel-${u.id}" aria-labelledby="tab-${u.id}" ${i === 0 ? '' : 'hidden'}>
      <div class="unit-panel__head">
        <p class="unit-panel__type"><b>${u.label}</b><sup>㎡</sup>${u.suffix}</p>
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
        <ul>${(notes[u.page] || []).map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
      </details>
    </article>`).join('');

  const tabEls = [...tabs.querySelectorAll('[role=tab]')];
  const select = (tab, focus = false) => {
    tabEls.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) tab.focus();
  };
  tabs.addEventListener('click', (e) => { const t = e.target.closest('[role=tab]'); if (t) select(t); });
  tabs.addEventListener('keydown', (e) => {
    const i = tabEls.indexOf(document.activeElement);
    if (i < 0) return;
    if (e.key === 'ArrowRight') select(tabEls[(i + 1) % tabEls.length], true);
    if (e.key === 'ArrowLeft') select(tabEls[(i - 1 + tabEls.length) % tabEls.length], true);
  });
  const hash = new URLSearchParams(location.search).get('type');
  if (hash) {
    const t = tabEls.find((x) => x.id === `tab-${hash.toLowerCase()}`);
    if (t) select(t);
  }
}

renderNotes();
renderSummaryTable(document.getElementById('unitSummaryTable'));
renderSummaryTable(document.getElementById('unitSummaryTable2'));
renderUnits();
initSite();
