export const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    phone_digits TEXT NOT NULL,
    unit_type TEXT NOT NULL,
    visit_date TEXT,
    message TEXT,
    agree_privacy INTEGER NOT NULL DEFAULT 0,
    agree_marketing INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'new',
    memo TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  'CREATE INDEX IF NOT EXISTS idx_app_created ON applications(created_at)',
  'CREATE INDEX IF NOT EXISTS idx_app_status ON applications(status)',
  'CREATE INDEX IF NOT EXISTS idx_app_phone ON applications(phone_digits)',
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS content (
    key TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS login_attempts (
    ip TEXT NOT NULL,
    at INTEGER NOT NULL
  )`,
  'CREATE INDEX IF NOT EXISTS idx_login_ip ON login_attempts(ip, at)',
  `CREATE TABLE IF NOT EXISTS popups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL DEFAULT 'general',
    title TEXT NOT NULL,
    body TEXT,
    image TEXT,
    link_url TEXT,
    link_label TEXT,
    start_date TEXT,
    end_date TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
];

export const DEFAULT_SETTINGS = {
  apply_closed: '0',
  popup_mode: 'individual', // 팝업이 여러 개일 때: individual(개별 팝업) | slide(슬라이드 팝업)
  closed_title: '관심고객 등록이 마감되었습니다',
  closed_message:
    '성원에 감사드립니다. 현재 관심고객 등록 접수가 마감되었습니다.\n분양 관련 문의는 분양홍보관으로 연락 주시기 바랍니다.',
};

export const STATUSES = {
  new: '신규',
  contacted: '연락완료',
  visited: '방문예약',
  contracted: '계약',
  hold: '보류',
};

export const UNIT_TYPES = ['59', '63', '74', '84A', '84B', '84C', '84D', '84E', '99', '115P'];

export const POPUP_TYPES = { event: '이벤트', notice: '긴급공지', general: '일반' };
export const POPUP_MODES = ['individual', 'slide'];

/** 최초 1회만 넣는 기본 팝업 (관리자가 지워도 다시 생기지 않음) */
export const DEFAULT_POPUPS = [
  {
    type: 'event',
    title: '관심고객 사전등록 오픈',
    body: '백석시그니처자이 관심고객 사전등록이 시작되었습니다.\n지금 등록하시면 분양 일정과 상담 정보를 가장 먼저 안내해 드립니다.',
    image: '/images/exterior.webp',
    link_url: '/apply.html',
    link_label: '관심고객 등록하기',
    sort_order: 1,
  },
  {
    type: 'notice',
    title: '[긴급공지] 홍보물 이용 안내',
    body: '본 홈페이지에 사용된 사진, 이미지, CG 등은 소비자의 이해를 돕기 위한 것으로 실제와 다를 수 있습니다.\n홈페이지 내용과 입주자모집공고문 및 분양계약서 내용이 서로 다를 경우 입주자모집공고문 및 분양계약서 내용이 우선 적용됩니다.',
    image: null,
    link_url: '/notice.html',
    link_label: '유의사항 확인하기',
    sort_order: 2,
  },
];
