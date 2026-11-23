# 백석시그니처자이 디자인 시스템

카탈로그 시안(22p)의 톤앤매너를 웹 토큰과 컴포넌트로 옮긴 문서입니다.
구현은 `frontend/src/styles/tokens.css`(토큰)와 `components.css`(컴포넌트)에 있습니다.

## 1. 컨셉

| 카탈로그 요소 | 웹 적용 |
|---|---|
| 표지의 **미드나잇 네이비** 면과 세로 체크 스트라이프 | 히어로, CTA 밴드, 신청·로그인 화면 배경 (`--pattern-stripe`) |
| 표지 하단의 **아치(Arch)** 모티프 | CTA·신청 화면의 장식 원호, 마감 안내 아이콘 (`--radius-arch`) |
| 웜 **그레이지/스톤** 면 (EXTERIOR·UNIT·뒷표지) | 교차 섹션 배경 `--stone-100/200`, 브랜드 스토리 |
| 페이지 좌상단 **세로바 + 영문 라벨 + 2줄 국문 헤드라인** | `.sec-head` 섹션 헤더 |
| 네이비 **바 타이틀** (스마트홈·유의사항 표 헤더) | `.bar-title` |
| 다크 그레이 3×3 **체커 그리드** (스마트·에너지 시스템) | `.checker` |
| 평면 범례 컬러 (주황·분홍·청록) | `--accent-copper / rose / teal`, 타입 칩 컬러 |

## 2. 토큰

### 컬러

| 토큰 | 값 | 용도 |
|---|---|---|
| `--navy-950` | `#071822` | 푸터 |
| `--navy-900` | `#0b1f2c` | 헤더, 다크 섹션, 바 타이틀 |
| `--navy-800` | `#0f2a3b` | Primary 버튼, 포인트 |
| `--navy-600` | `#1d4660` | Hover |
| `--stone-100` | `#f2eee8` | 교차 섹션 |
| `--stone-200` | `#e8e2d9` | 외관·유닛 섹션 |
| `--stone-300` | `#d9d0c3` | 보조 바, 입력 테두리 |
| `--ink-900 / 700 / 500` | `#1b1d1f / #3b3f44 / #6a6f75` | 본문 / 보조 / 캡션 |
| `--accent-copper` | `#c8743a` | 필수 표시, 옵션 강조 |
| `--color-danger` | `#b2423a` | 삭제, 마감 상태 |

타입별 칩 컬러는 동·호수 배치도 범례를 따릅니다 (`frontend/src/data/units.js`).

### 타이포그래피

- 국문: **Asta Sans** (카탈로그 사용 서체), 대체 서체 Pretendard
- 영문 라벨: **Plus Jakarta Sans** (카탈로그 사용 서체)

| 토큰 | 크기 | 용도 |
|---|---|---|
| `--fs-display` | 40 → 76px (clamp) | 히어로 단지명 |
| `--fs-h1` / `--fs-h2` | 32 → 52 / 26 → 40px | 페이지·섹션 헤드라인 (weight 500, 자간 -0.02em) |
| `--fs-h3` | 20 → 26px | 서브 타이틀 |
| `--fs-body-lg` / `--fs-body` | 17 / 16px | 설명 / 본문 |
| `--fs-note` | 11px | ※ 유의사항 |

영문 라벨은 대문자로 쓰고 자간을 넓게(0.06–0.32em) 둡니다. 국문은 `word-break: keep-all`로 단어 단위 줄바꿈을 지킵니다.

### 간격, 형태, 모션

- 8px 그리드: `--sp-1`(4px) ~ `--sp-10`(128px)
- 섹션 상하 여백: `--section-y` (80 → 160px)
- 거터: `--gutter` (16 → 40px). 컨테이너 최대폭은 1280px
- 모서리: 기본 0(카탈로그의 직각 그리드), 배지만 pill, 장식은 arch
- 모션: `--ease` cubic-bezier(.22,.61,.36,1). 스크롤 등장(`.reveal`)은 800ms이며, `prefers-reduced-motion`이면 끕니다

## 3. 컴포넌트

| 컴포넌트 | 클래스 | 비고 |
|---|---|---|
| 헤더/GNB | `.site-header`, `.gnb`, `.menu-toggle` | 투명 → 스크롤 시 네이비, 1080px 이하는 풀스크린 메뉴 |
| 버튼 | `.btn` + `--light / --ghost / --outline / --danger`, `--sm / --lg / --block` | 직각, 화살표 `.btn__arrow` |
| 섹션 헤더 | `.sec-head`, `__label`, `__title`, `__desc`, `--center` | 세로바 상단 22%가 네이비 |
| 바 타이틀 | `.bar-title`, `--sub` | 시스템 다이어그램 헤더 |
| 미디어 | `.media`, `--zoom`(라이트박스), `--contain`, `.media__cap` | 확대 가능한 도면 |
| 특징 리스트 | `.feature` | 번호 원형 아이콘 |
| 시설 리스트 | `.facility-list` | `시설명 \| 설명` 형식 |
| 체커 그리드 | `.checker`, `.checker-pair` | 다크 3×3, 텍스트와 이미지를 교차 배치 |
| 표 | `.table`, `.type-chip` | 네이비 헤더, 합계 행 |
| 탭 | `.tabs`, `.tab` | 평면 타입, 키보드 ←/→ 지원 |
| 유의사항 | `.notes`(접이식 ※), `.acc`(아코디언) | 카탈로그 원문 |
| 폼 | `.field`, `.input`, `.select`, `.textarea`, `.check`, `.chip-group`, `.switch` | 오류 상태는 `aria-invalid` |
| 배지 | `.badge--new / contacted / visited / contracted / hold` | 신청 상태 |
| 모달/토스트 | `.modal`, `.lightbox`, `.toast` | |
| 편집기 | `.xe-bar`, `.xe-pop` (editor 청크 전용) | 관리자에게만 로드 |

## 4. 접근성

- 본문 바로가기 링크, 키보드 포커스 링(`:focus-visible`), 탭과 라이트박스의 키보드 조작을 지원합니다.
- 모든 이미지에 의미 있는 대체텍스트를 넣었습니다. 장식 이미지는 `alt=""`입니다.
- 폼 오류는 `aria-describedby`와 `aria-invalid`로 연결하고, 결과는 `aria-live`로 알립니다.
