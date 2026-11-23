import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/components.css';
import '../styles/site.css';
import '../styles/apply.css';
import { initSite } from './site.js';

const main = document.getElementById('applyMain');
const clone = (id) => document.getElementById(id).content.firstElementChild.cloneNode(true);

function showClosed(title, message) {
  const box = clone('tplClosed');
  box.querySelector('.closed-box__title').textContent = title || '관심고객 등록이 마감되었습니다';
  box.querySelector('.closed-box__msg').textContent = message || '';
  main.replaceChildren(box);
}

function showDone() {
  main.replaceChildren(clone('tplDone'));
  main.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

const formatPhone = (v) => {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length < 4) return d;
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
};

function clientValidate(data) {
  const errors = {};
  if (!/^[가-힣a-zA-Z ]{2,20}$/.test(data.name.trim())) errors.name = '이름은 한글 또는 영문 2~20자로 입력해 주세요.';
  if (!/^01[016789]\d{7,8}$/.test(data.phone.replace(/\D/g, ''))) errors.phone = '휴대폰 번호를 정확히 입력해 주세요.';
  if (!data.unitType) errors.unitType = '관심 타입을 선택해 주세요.';
  if (data.message.length > 500) errors.message = '문의 내용은 500자 이내로 입력해 주세요.';
  if (!data.agreePrivacy) errors.agreePrivacy = '개인정보 수집·이용에 동의해 주세요.';
  return errors;
}

function showErrors(form, errors) {
  form.querySelectorAll('.field__error').forEach((p) => { p.textContent = ''; });
  form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
  let first = null;
  for (const [k, msg] of Object.entries(errors)) {
    const p = form.querySelector(`#e-${k}`);
    if (p) p.textContent = msg;
    const input = form.querySelector(`[name="${k}"]`);
    if (input) { input.setAttribute('aria-invalid', 'true'); first ||= input; }
  }
  first?.focus();
}

function showForm(unitTypes) {
  const form = clone('tplForm');
  const f = form.elements;
  const preset = (new URLSearchParams(location.search).get('type') || '').toUpperCase();
  form.querySelector('#typeChips').innerHTML = unitTypes.map((t) => {
    const m = t.match(/^(\d+)([A-Z]?)$/);
    return `<label><input type="radio" name="unitType" value="${t}" ${t === preset ? 'checked' : ''} aria-describedby="e-unitType" /><span>${m[1]}<small>㎡</small>${m[2]}</span></label>`;
  }).join('');
  const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  f.visitDate.min = today;
  f.visitDate.max = new Date(Date.now() + (9 + 24 * 180) * 3600e3).toISOString().slice(0, 10);
  f.phone.addEventListener('input', () => { f.phone.value = formatPhone(f.phone.value); });

  const alertBox = form.querySelector('.form-alert');
  const submit = form.querySelector('[type=submit]');
  let busy = false;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (busy) return;
    alertBox.hidden = true;
    const data = {
      name: f.name.value,
      phone: f.phone.value,
      unitType: f.unitType.value,
      visitDate: f.visitDate.value,
      message: f.message.value.trim(),
      agreePrivacy: f.agreePrivacy.checked,
      agreeMarketing: f.agreeMarketing.checked,
      website: f.website.value,
    };
    const errors = clientValidate(data);
    showErrors(form, errors);
    if (Object.keys(errors).length) return;

    busy = true;
    submit.disabled = true;
    submit.firstChild.textContent = '등록 중… ';
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) { showDone(); return; }
      if (body.code === 'APPLICATIONS_CLOSED') { showClosed(body.title, body.message); return; }
      if (body.errors) showErrors(form, body.errors);
      alertBox.textContent = body.message || '등록에 실패했습니다. 잠시 후 다시 시도해 주세요.';
      alertBox.hidden = false;
    } catch {
      alertBox.textContent = '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
      alertBox.hidden = false;
    } finally {
      busy = false;
      submit.disabled = false;
      submit.firstChild.textContent = '관심고객 등록하기 ';
    }
  });

  main.replaceChildren(form);
}

async function boot() {
  try {
    const res = await fetch('/api/public/settings');
    const s = await res.json();
    if (s.applyClosed) showClosed(s.closedTitle, s.closedMessage);
    else showForm(s.unitTypes);
  } catch {
    main.innerHTML = '<p class="apply-loading">일시적으로 신청 화면을 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.</p>';
  }
  await initSite();
}

boot();
