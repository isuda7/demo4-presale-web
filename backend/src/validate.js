import { UNIT_TYPES } from './schema.js';

/** 한국시간 기준 'YYYY-MM-DD HH:MM:SS' */
export function nowKst() {
  const d = new Date(Date.now() + 9 * 3600 * 1000);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

export function todayKst() {
  return nowKst().slice(0, 10);
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const isDate = (v) => typeof v === 'string' && DATE_RE.test(v) && !Number.isNaN(Date.parse(v));

export function formatPhone(digits) {
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** 신청 입력값 검증. 성공 시 { value }, 실패 시 { errors } */
export function validateApplication(body) {
  const errors = {};
  const b = body && typeof body === 'object' ? body : {};

  const name = String(b.name ?? '').trim().replace(/\s+/g, ' ');
  if (!/^[가-힣a-zA-Z ]{2,20}$/.test(name)) errors.name = '이름은 한글 또는 영문 2~20자로 입력해 주세요.';

  const phoneDigits = String(b.phone ?? '').replace(/\D/g, '');
  if (!/^01[016789]\d{7,8}$/.test(phoneDigits)) errors.phone = '휴대폰 번호를 정확히 입력해 주세요.';

  const unitType = String(b.unitType ?? '').toUpperCase();
  if (!UNIT_TYPES.includes(unitType)) errors.unitType = '관심 타입을 선택해 주세요.';

  let visitDate = String(b.visitDate ?? '').trim();
  if (visitDate) {
    const today = todayKst();
    const max = new Date(Date.now() + (9 + 24 * 180) * 3600 * 1000).toISOString().slice(0, 10);
    if (!isDate(visitDate)) errors.visitDate = '방문 희망일 형식이 올바르지 않습니다.';
    else if (visitDate < today) errors.visitDate = '방문 희망일은 오늘 이후로 선택해 주세요.';
    else if (visitDate > max) errors.visitDate = '방문 희망일은 180일 이내로 선택해 주세요.';
  } else visitDate = null;

  const message = String(b.message ?? '').trim();
  if (message.length > 500) errors.message = '문의 내용은 500자 이내로 입력해 주세요.';

  if (b.agreePrivacy !== true) errors.agreePrivacy = '개인정보 수집·이용에 동의해 주세요.';

  if (Object.keys(errors).length) return { errors };
  return {
    value: {
      name,
      phone: formatPhone(phoneDigits),
      phoneDigits,
      unitType,
      visitDate,
      message: message || null,
      agreePrivacy: 1,
      agreeMarketing: b.agreeMarketing === true ? 1 : 0,
    },
  };
}

const SAFE_HREF = /^(https?:\/\/|\/|#|tel:|mailto:|\.\/)/i;

/** 인라인 편집 콘텐츠 검증 */
export function validateContentItem(item) {
  if (!item || typeof item !== 'object') return '잘못된 항목입니다.';
  const { key, type, value } = item;
  if (typeof key !== 'string' || !/^[\w:.\-]{1,120}$/.test(key)) return '편집 키가 올바르지 않습니다.';
  if (type === 'text') {
    if (typeof value !== 'string' || value.length > 5000) return '텍스트는 5000자 이내여야 합니다.';
  } else if (type === 'button') {
    if (!value || typeof value !== 'object') return '버튼 값이 올바르지 않습니다.';
    if (typeof value.text !== 'string' || value.text.length > 200) return '버튼 문구는 200자 이내여야 합니다.';
    if (value.href != null && (typeof value.href !== 'string' || !SAFE_HREF.test(value.href) || value.href.length > 1000)) {
      return '링크는 http(s)://, /, #, tel:, mailto: 로 시작해야 합니다.';
    }
  } else if (type === 'image') {
    if (!value || typeof value !== 'object' || typeof value.src !== 'string') return '이미지 값이 올바르지 않습니다.';
    const src = value.src;
    const okData = /^data:image\/(webp|jpeg|png|gif);base64,[A-Za-z0-9+/=]+$/.test(src) && src.length <= 3_000_000;
    const okUrl = /^(https:\/\/|\/images\/)/.test(src) && src.length <= 1000;
    if (!okData && !okUrl) return '이미지는 3MB 이하의 업로드 파일 또는 https 주소만 가능합니다.';
    if (value.alt != null && (typeof value.alt !== 'string' || value.alt.length > 300)) return '대체텍스트는 300자 이내여야 합니다.';
  } else return '지원하지 않는 편집 유형입니다.';
  return null;
}
