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
];

export const DEFAULT_SETTINGS = {
  apply_closed: '0',
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
