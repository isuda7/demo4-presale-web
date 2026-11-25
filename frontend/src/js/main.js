// 사이트 공통 진입점.
// 면적표·평면 탭·유의사항·FAQ는 빌드 플러그인(frontend/build/seo-plugin.js)이 정적 HTML로 미리 넣는다.
// 여기서는 그 마크업에 동작(탭 전환 등)만 붙인다.
import { initSite } from './site.js';

function initUnitTabs() {
  const tabs = document.getElementById('unitTabs');
  if (!tabs) return;
  const tabEls = [...tabs.querySelectorAll('[role=tab]')];
  if (!tabEls.length) return;
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
  const type = new URLSearchParams(location.search).get('type');
  if (type) {
    const t = tabEls.find((x) => x.id === `tab-${type.toLowerCase()}`);
    if (t) select(t);
  }
}

initUnitTabs();
initSite();

// 메인 페이지에서만 팝업 노출 (관리자 편집 모드 진입 시 제외)
if (document.body.dataset.page === 'index' && !new URLSearchParams(location.search).has('edit')) {
  import('./popup.js').then((m) => m.showPopups());
}
