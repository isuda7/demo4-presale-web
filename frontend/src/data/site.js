// 사이트 사실 정보 · 페이지 목록 · FAQ — SEO/AEO/GEO의 단일 출처.
// 구조화 데이터(JSON-LD), FAQ 페이지, llms.txt, 사이트맵이 모두 이 파일을 읽는다.
// ※ 카탈로그(2026년 5월 주택건설사업계획승인(변경) 도면 기준)에 있는 사실만 적는다.
//   분양 일정·분양가·견본주택 주소처럼 카탈로그에 없는 정보는 확정되면 여기에 추가한다.

export const SITE = {
  name: '백석시그니처자이',
  nameEn: 'Baekseok Signature Xi',
  slogan: '불당의 가치 · 백석의 완성',
  summary:
    '백석시그니처자이는 충청남도 천안시 서북구 백석동에 들어서는 총 1,174세대(1단지 854세대, 2단지 320세대) 규모의 자이(Xi) 아파트입니다. 전용면적 59㎡부터 115㎡P까지 10개 타입으로 구성되며, 시공은 GS건설, 시행은 하나자산신탁이 맡습니다.',
  basis: '2026년 5월 주택건설사업계획승인(변경) 도면 기준이며, 입주자모집공고문 및 분양계약서와 다를 경우 입주자모집공고문 및 분양계약서가 우선합니다.',
  address: {
    region: '충청남도',
    locality: '천안시 서북구',
    street1: '백석동 92-7번지 일원(1BL)',
    street2: '백석동 94번지 일원(2BL)',
  },
  blocks: [
    { name: '1단지(1BL)', households: 854, address: '충청남도 천안시 서북구 백석동 92-7번지 일원', grossFloorArea: '140,212.5010㎡' },
    { name: '2단지(2BL)', households: 320, address: '충청남도 천안시 서북구 백석동 94번지 일원', grossFloorArea: '55,687.3938㎡' },
  ],
  totalHouseholds: 1174,
  developer: '하나자산신탁',
  builder: 'GS건설',
  agent: '주식회사 중앙홀딩스',
  use: '공동주택 및 부대복리시설',
  landOwnership: '대지소유권 100% 확보',
  amenities: [
    '피트니스클럽', '필라테스(그룹)', 'GX룸', '사우나', '카페라운지(OCS)', '작은도서관(교보문고)', '키즈놀이터', '솔닥(원격진료서비스)',
    '골프연습장(GDR)', '스크린골프', '키즈도서관', '독서실·1인 독서실', '게스트하우스',
    '스카이라운지(CLUB CLOUD, 28층)', '다목적실', '멀티룸',
  ],
  defaultImage: '/images/landmark-aerial.webp',
};

/** 공개 페이지 (사이트맵·브레드크럼·llms.txt 순서). admin·404는 제외 */
export const PAGES = [
  { name: 'index', path: '/', label: '홈', image: '/images/hero-aerial.webp', priority: '1.0' },
  { name: 'premium', path: '/premium.html', label: '프리미엄', image: '/images/landmark-aerial.webp' },
  { name: 'location', path: '/location.html', label: '입지환경', image: '/images/location-map.webp' },
  { name: 'complex', path: '/complex.html', label: '단지설계', image: '/images/exterior.webp' },
  { name: 'community', path: '/community.html', label: '커뮤니티', image: '/images/cx-cafe.webp' },
  { name: 'system', path: '/system.html', label: '시스템', image: '/images/smart-hero.webp' },
  { name: 'unit', path: '/unit.html', label: '세대안내', image: '/images/unit-interior.webp', priority: '0.9' },
  { name: 'layout', path: '/layout.html', label: '배치도', image: '/images/site-plan.webp' },
  { name: 'notice', path: '/notice.html', label: '유의사항', image: '/images/hero-aerial.webp' },
  { name: 'faq', path: '/faq.html', label: '자주 묻는 질문', image: '/images/landmark-aerial.webp', priority: '0.9' },
  { name: 'apply', path: '/apply.html', label: '관심고객 등록', image: '/images/exterior.webp', priority: '0.8' },
];

/** 자주 묻는 질문 — 답은 첫 문장에 결론을 쓴다(답변엔진이 그대로 인용하기 좋게). */
export const FAQ = [
  {
    q: '백석시그니처자이는 어디에 있나요?',
    a: [
      '충청남도 천안시 서북구 백석동에 있습니다. 1단지는 백석동 92-7번지 일원, 2단지는 백석동 94번지 일원입니다.',
      '불당 생활권과 맞닿아 있고, 번영로·음봉로·동서대로 등 천안의 중심도로망과 연결됩니다.',
    ],
    link: { href: '/location.html', label: '입지환경 자세히 보기' },
  },
  {
    q: '총 세대수는 몇 세대인가요?',
    a: ['총 1,174세대입니다. 1단지 854세대, 2단지 320세대로 구성됩니다.'],
    link: { href: '/layout.html', label: '동·호수 배치도 보기' },
  },
  {
    q: '어떤 평형(타입)이 있나요?',
    a: [
      '전용면적 기준 59㎡, 63㎡, 74㎡, 84㎡A·B·C·D·E, 99㎡, 115㎡P 등 10개 타입이 있습니다.',
      '1단지는 59㎡·63㎡·74㎡·84㎡A·B·C·99㎡·115㎡P, 2단지는 84㎡A·D·E 타입으로 구성됩니다.',
    ],
    link: { href: '/unit.html', label: '타입별 평면·면적 보기' },
  },
  {
    q: '84㎡ 타입은 몇 가지이고, 세대수는 어떻게 되나요?',
    a: [
      '84㎡는 A·B·C·D·E 5가지 타입입니다. 84㎡A는 1단지 211세대·2단지 249세대, 84㎡B는 1단지 182세대, 84㎡C는 1단지 106세대, 84㎡D는 2단지 56세대, 84㎡E는 2단지 15세대입니다.',
    ],
    link: { href: '/unit.html?type=84a', label: '84㎡ 평면 보기' },
  },
  {
    q: '시공사와 시행사는 어디인가요?',
    a: ['시공은 GS건설, 시행은 하나자산신탁, 위탁은 주식회사 중앙홀딩스입니다.'],
  },
  {
    q: '단지 안에는 어떤 커뮤니티 시설이 있나요?',
    a: [
      '1단지와 2단지에 각각 커뮤니티 CLUB XIAN이 있고, 101동 최상층(28층)에 스카이커뮤니티 CLUB CLOUD가 있습니다.',
      'CLUB XIAN(1단지)에는 피트니스클럽, 필라테스, GX룸, 사우나, 카페라운지, 작은도서관(교보문고), 키즈놀이터가, CLUB XIAN(2단지)에는 골프연습장(GDR), 스크린골프, 키즈도서관, 독서실이 계획되어 있습니다. CLUB CLOUD에는 스카이라운지, 다목적실, 멀티룸이 있습니다.',
      'CLUB XIAN은 1·2단지 입주민이 공동으로 운영·관리하며, 세부 운영 방안은 입주 후 입주자대표회의에서 결정합니다.',
    ],
    link: { href: '/community.html', label: '커뮤니티 자세히 보기' },
  },
  {
    q: '초등학교는 어디로 배정되나요?',
    a: ['천안한들초등학교에 배정될 예정입니다. 다만 배정 방법은 교육부 정책에 따라 변경될 수 있으니 관할 교육청에 확인하시기 바랍니다.'],
    link: { href: '/notice.html', label: '학교 관련 유의사항 보기' },
  },
  {
    q: '전기차 충전기는 몇 대인가요?',
    a: ['1단지는 급속 13대·완속 48대·콘센트형 24대, 2단지는 급속 5대·완속 18대·콘센트형 9대가 계획되어 있습니다. 배치 위치는 인허가 과정에서 달라질 수 있습니다.'],
    link: { href: '/system.html', label: '편의·에너지 시스템 보기' },
  },
  {
    q: '입지의 장점은 무엇인가요?',
    a: [
      '불당의 의료·상업·교육 인프라를 함께 누리는 핵심생활권, 삼성SDI·백석농공단지·천안제3일반산업단지와 가까운 직주근접, 번영로·음봉로·동서대로의 쾌속교통, 도보권 초교와 불당·백석 학원가, 이마트·코스트코·갤러리아백화점 등 편의시설이 장점입니다.',
    ],
    link: { href: '/location.html', label: '입지환경 보기' },
  },
  {
    q: '분양 일정과 견본주택 위치는 어디서 확인하나요?',
    a: ['분양 일정과 견본주택 정보는 확정되는 대로 안내합니다. 관심고객으로 등록하시면 일정과 상담 정보를 가장 먼저 받아보실 수 있습니다.'],
    link: { href: '/apply.html', label: '관심고객 등록하기' },
  },
];
