# 백석시그니처자이 분양사이트

카탈로그(`260604_백석시그니처자이_카탈로그_시안.pdf`)를 기반으로 만든 분양 홍보 사이트입니다.
구성은 다음과 같습니다.

- 메인 + 메뉴별 8개 페이지(카탈로그 전 콘텐츠)
- 관심고객 등록
- 관리자(신청 관리·마감 스위치)
- 관리자 전용 인라인 편집

| 구분 | 기술 |
|---|---|
| 프론트엔드 | HTML/CSS/JS, Vite 멀티페이지 (`frontend/`) |
| 백엔드 | Hono (`backend/`), Vercel Function 진입점 `api/index.js` |
| DB | Turso(libSQL). 로컬에서는 같은 엔진의 파일 DB를 사용합니다 |
| 배포 | GitHub에 푸시하면 Vercel이 자동으로 빌드·배포합니다 |

원본 요구사항은 [doc/prompt.md](doc/prompt.md), 디자인 시스템은 [doc/design-system.md](doc/design-system.md)에 있습니다.

## 폴더 구조

```
.
├─ api/index.js              # Vercel Function: backend 앱을 그대로 실행
├─ backend/
│  ├─ src/app.js             # Hono 라우트 (공개 / 인증 / 관리자 API)
│  ├─ src/auth.js            # 비밀번호 검증, JWT 쿠키 세션, 로그인 시도 제한
│  ├─ src/db.js, schema.js   # Turso 연결, 스키마 자동 보장
│  ├─ src/validate.js        # 신청 데이터와 편집 콘텐츠 검증
│  ├─ src/server.js          # 로컬 개발 서버 (포트 8787)
│  └─ scripts/               # migrate.js, seed.js
├─ frontend/
│  ├─ index.html             # 메인 (히어로 + 메뉴 바로가기)
│  ├─ premium.html           # 프리미엄 (p.2 랜드마크, p.18 브랜드)
│  ├─ location.html          # 입지환경 (p.3)
│  ├─ complex.html           # 단지설계 (p.4~5)
│  ├─ community.html         # 커뮤니티 (p.6~8)
│  ├─ system.html            # 시스템 (p.9~10)
│  ├─ unit.html              # 세대안내 (p.11~16, ?type=84a 로 타입 지정)
│  ├─ layout.html            # 배치도 (p.17~18)
│  ├─ notice.html            # 사업개요·유의사항 (p.18~22)
│  ├─ apply.html             # 관심고객 등록
│  ├─ admin.html             # 관리자
│  ├─ partials/              # 공통 head·header·cta·footer·aos-setup (<!-- @include x.html -->)
│  ├─ public/images/         # 카탈로그에서 추출한 WebP 이미지
│  └─ src/
│     ├─ styles/             # main.css·admin-entry.css(진입점) → tokens / base / components / site / apply / admin
│     ├─ js/                 # main, apply, admin, site(공통), content(편집값 반영)
│     ├─ js/editor/          # 인라인 편집기 (관리자 확인 후에만 동적 로드)
│     └─ data/               # notes.json(※ 유의사항 원문), units.js(타입 데이터)
├─ doc/                      # 요구사항 프롬프트, 디자인 시스템
├─ vercel.json
└─ .env.example              # 환경변수 이름만 적혀 있음 (값 없음)
```

## 로컬 실행

필요 환경: Node.js 20.19 이상 (22 LTS 권장)

1. 의존성을 설치합니다.

   ```bash
   npm install
   ```

2. 환경변수 파일을 만듭니다.

   ```bash
   cp .env.example .env
   ```

   `.env`에 `ADMIN_PASSWORD`와 `ADMIN_TOKEN_SECRET`(32자 이상 무작위 값)을 직접 넣습니다. 무작위 값은 다음 명령으로 만들 수 있습니다.

   ```bash
   openssl rand -hex 32
   ```

   `TURSO_DATABASE_URL`을 비워 두면 로컬 파일 DB `backend/data/local.db`를 자동으로 사용합니다.

3. (선택) 스키마를 만들고 샘플 데이터를 넣습니다. 스키마는 서버가 처음 요청을 받을 때도 자동으로 만들어집니다.

   ```bash
   npm run db:migrate
   ```

   ```bash
   npm run db:seed
   ```

4. 개발 서버를 실행합니다. API(8787)와 Vite(5173)가 함께 뜹니다.

   ```bash
   npm run dev
   ```

   - 사이트: http://localhost:5173 (메뉴: /premium.html, /location.html, /complex.html, /community.html, /system.html, /unit.html, /layout.html, /notice.html)
   - 신청: http://localhost:5173/apply.html
   - 관리자: http://localhost:5173/admin.html

운영과 같은 빌드를 확인하려면 `npm run build`를 실행한 뒤 `npm run dev:api`와 `npm run preview`를 함께 띄웁니다.

## 환경변수

값은 코드와 문서 어디에도 적지 않습니다. 로컬에서는 `.env`(git 제외), 운영에서는 Vercel 프로젝트 설정에만 넣습니다.

| 이름 | 필수 | 설명 |
|---|---|---|
| `ADMIN_PASSWORD` | 필수 | 관리자 로그인 비밀번호 |
| `ADMIN_TOKEN_SECRET` | 필수 | 관리자 세션 토큰(JWT HS256) 서명키, 32자 이상 |
| `TURSO_DATABASE_URL` | 운영 필수 | `libsql://<db>-<org>.turso.io` 형식. 로컬에서 비우면 파일 DB를 사용 |
| `TURSO_AUTH_TOKEN` | 운영 필수 | Turso DB 토큰 |
| `API_PORT` | 선택 | 로컬 API 포트 (기본 8787) |

## 배포 (Turso + Vercel)

1. **Turso DB를 만듭니다** ([Turso CLI](https://docs.turso.tech) 설치 후).

   ```bash
   turso db create baekseok-xi
   ```

   ```bash
   turso db show baekseok-xi --url
   ```

   ```bash
   turso db tokens create baekseok-xi
   ```

   출력된 URL과 토큰은 다음 단계에서 Vercel에만 입력합니다.

2. **GitHub에 푸시합니다.**

   ```bash
   git remote add origin <저장소 URL>
   ```

   ```bash
   git push -u origin main
   ```

3. **Vercel에서 저장소를 Import합니다.** `vercel.json`에 빌드 명령(`npm run build`), 출력 폴더(`frontend/dist`), `/api/*` 라우팅이 이미 들어 있어 추가 설정이 필요 없습니다.

4. **Vercel 환경변수를 설정합니다.** Project → Settings → Environment Variables에 `ADMIN_PASSWORD`, `ADMIN_TOKEN_SECRET`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`을 넣고 재배포합니다.

5. 첫 요청 때 테이블이 자동으로 생성됩니다. 이후에는 `main`에 푸시할 때마다 자동으로 빌드·배포됩니다.

## 페이지 구성

- 각 메뉴는 독립 HTML 페이지입니다. 상단에 서브비주얼(메뉴명·브레드크럼)이 있고, 메뉴 간 이동은 헤더 GNB 하나로만 합니다(현재 메뉴 강조 표시).
- 헤더·푸터·CTA는 `frontend/partials/`에 한 번만 작성하고, Vite 플러그인(`frontend/vite.config.js`)이 빌드 때 `<!-- @include 파일명 -->` 위치에 끼워 넣습니다.
- `frontend/`에 `*.html`을 추가하면 자동으로 빌드 대상에 포함됩니다. GNB에 노출하려면 `partials/header.html`에 `data-menu`가 페이지의 `body[data-page]`와 같은 링크를 추가합니다.
- 헤더 버튼과 푸터 문구는 키가 고정되어 있어, 한 번 편집하면 모든 페이지에 반영됩니다.

## 스타일 로딩

- CSS는 JS에서 import하지 않고 HTML `<head>`의 `<link rel="stylesheet">`로 불러옵니다. 개발 서버와 빌드 모두 첫 화면이 그려지기 전에 스타일이 적용되어, 스타일 없는 화면이 잠깐 보이는 현상(FOUC)이 없습니다.
  - 사이트 공통: `src/styles/main.css` (`partials/head.html`에서 연결)
  - 신청 화면 추가분: `src/styles/apply.css`, 관리자: `src/styles/admin-entry.css`
  - 예외: 인라인 편집기 CSS는 관리자에게만 필요하므로 편집기 JS와 함께 지연 로드합니다.
- 웹폰트는 Google Fonts의 Asta Sans·Plus Jakarta Sans만 사용합니다(`display=swap`). 대체 서체 Pretendard CDN은 첫 화면을 늦춰 제거했고, 대체는 시스템 서체(Apple SD Gothic Neo, Noto Sans KR)가 맡습니다.

## 스크롤 등장 효과 (AOS)

- 사이트 전체 공통으로 적용됩니다. 설정 값과 대상은 `frontend/partials/aos-setup.html` 한 곳에서만 관리하고, 이 파일은 푸터에 포함되어 모든 페이지에 자동 적용됩니다. 새 페이지도 별도 작업이 필요 없습니다.
- 첫 화면(히어로·서브비주얼)은 스크롤 대신 로드할 때 나타납니다(16px, 800ms, 두 번째 요소부터 150ms 지연).
- 섹션 안 비주얼(이미지·도면·카드)과 텍스트 블록은 아래에서 위로 올라오며 한 번만 나타납니다(24px, 700ms, ease-out, 하단 80px 진입 시 시작, 두 번째 요소부터 100ms 지연). 전폭 배경형 비주얼은 이동 없이 페이드만 합니다.
- 카드 묶음(메뉴 카드, 사진 스트립, 갤러리 등)은 왼쪽부터 100ms 간격으로 나타나며, 지연은 3번째 카드까지만 붙습니다.
- 제외하려면 섹션이나 요소에 `data-aos-off`를 답니다. 동작 줄이기(`prefers-reduced-motion`) 환경과 관리자 편집 모드에서는 효과를 끕니다.
- 등장이 끝난 요소는 AOS 속성을 걷어내 버튼·카드의 기존 hover 전환을 유지합니다.

## 기능 요약

### 관심고객 등록 (`/apply.html`)

- 입력 항목: 이름, 휴대폰, 관심 타입(10종), 방문 희망일, 문의 내용, 개인정보 동의(필수), 마케팅 동의(선택)
- 입력값은 클라이언트와 서버에서 모두 검증합니다. 24시간 안에 같은 번호로 다시 신청하면 409를 반환합니다. 허니팟 필드로 봇을 막습니다.
- 마감 상태에서는 폼을 아예 렌더링하지 않고 안내만 보여줍니다. API도 `403 APPLICATIONS_CLOSED`로 거부합니다.

### 관리자 (`/admin.html`)

- 비밀번호 로그인을 거치면 HttpOnly·SameSite=Strict 쿠키(8시간)가 발급됩니다. 15분 안에 5회 실패하면 로그인이 잠깁니다.
- 신청 목록에서 검색(이름·연락처·문의·메모), 상태·타입·기간 필터, 빠른 기간(오늘·7일·30일), 페이지 크기를 쓸 수 있습니다.
- 상태 변경(신규·연락완료·방문예약·계약·보류), 메모, 개별·일괄 삭제(확인 후)를 할 수 있습니다.
- CSV는 현재 필터를 적용해 내려받습니다. UTF-8 BOM을 붙여 엑셀에서 한글이 깨지지 않고, 수식 주입도 막습니다.
- 신청 마감 스위치와 마감 안내 문구를 편집할 수 있습니다.

### 메인 팝업

- 메인 페이지(`/`)에만 노출됩니다. 기본 팝업 2개(이벤트: 관심고객 사전등록 오픈, 긴급공지: 홍보물 이용 안내)가 DB를 처음 만들 때 한 번만 등록됩니다. 관리자가 지워도 다시 생기지 않습니다.
- **노출 방식**(관리자 → 팝업 관리): 팝업이 2개 이상일 때 적용됩니다.
  - **개별 팝업(기본)**: 나란히 각각 띄우고, 팝업마다 '닫기'와 '오늘 하루 보지 않기'를 할 수 있습니다. 모바일에서는 세로로 쌓입니다.
  - **슬라이드 팝업**: 한 창에서 좌우로 넘겨 봅니다. 화살표, 점 내비, 스와이프, 키보드(←/→)를 쓸 수 있고 5초마다 자동으로 넘어갑니다(마우스를 올리거나 포커스가 있으면 멈춤). '오늘 하루 보지 않기'는 슬라이드 전체에 적용됩니다.
- 팝업 항목: 구분(이벤트·긴급공지·일반), 제목, 내용, 이미지(업로드 시 1200px로 자동 축소, 또는 주소), 링크·버튼 문구, 노출 기간, 순서, 노출 여부
- '오늘 하루 보지 않기'는 방문자 브라우저(localStorage)에 팝업별로 오늘 날짜(KST)를 저장합니다. 관리자의 **메인에서 미리보기**(`/?popup=preview`)는 이 기록을 무시하고 모든 노출 팝업을 보여줍니다.
- 관리자 편집 모드(`/?edit=1`)에서는 팝업을 띄우지 않습니다.

### 인라인 편집

- 관리자로 로그인한 상태에서 사이트에 들어가면 상단에 편집 바가 생깁니다. **사이트 화면 편집** 버튼이나 `/?edit=1`로 바로 편집을 시작할 수도 있습니다.
- **텍스트**는 클릭해서 바로 입력합니다. **버튼**은 문구와 링크를, **이미지**는 업로드(자동 리사이즈·WebP 변환) 또는 주소와 alt를 바꿉니다. 오버레이에 덮인 배경 비주얼은 빈 영역을 클릭하면 바뀝니다.
- `⌘/Ctrl + S`로 저장합니다. 영역마다 **기본값 복원**을 할 수 있습니다.
- 방문자에게는 편집기 JS·CSS가 로드되지 않습니다. 관리자 표시 쿠키가 있을 때만 `/api/auth/me`를 서버에서 다시 검증하고, 통과해야 `editor` 청크를 동적으로 import합니다.
- 로그아웃하거나 세션이 만료되면 편집 바와 편집 상태가 즉시 사라집니다.
- 편집 HTML은 렌더링할 때 허용 태그(b, strong, em, small, br 등)만 남기고 모든 속성을 제거해 XSS를 막습니다.

## API

| 메서드 | 경로 | 인증 | 설명 |
|---|---|---|---|
| GET | `/api/health` | – | 헬스체크 |
| GET | `/api/public/settings` | – | 마감 여부, 안내 문구, 타입 목록 |
| GET | `/api/content` | – | 인라인 편집 저장값 |
| POST | `/api/applications` | – | 관심고객 등록 |
| POST | `/api/auth/login` · `/api/auth/logout` | – | 로그인 / 로그아웃 |
| GET | `/api/auth/me` | 쿠키 | 세션 확인 |
| GET | `/api/admin/applications` | 관리자 | 목록 (`q`, `status`, `unitType`, `from`, `to`, `page`, `size`) |
| GET | `/api/admin/applications.csv` | 관리자 | CSV (목록과 같은 필터) |
| PATCH | `/api/admin/applications/:id` | 관리자 | 상태·메모 수정 |
| DELETE | `/api/admin/applications` | 관리자 | `{ ids: [] }` 삭제 |
| GET/PUT | `/api/admin/settings` | 관리자 | 마감 스위치·안내 문구·팝업 노출 방식(`popupMode`: `individual` \| `slide`) |
| PUT | `/api/admin/content` | 관리자 | 편집 내용 저장 |
| GET | `/api/popups` | – | 메인 노출 팝업(노출 중·기간 내, 순서대로)과 노출 방식 |
| GET/POST | `/api/admin/popups` | 관리자 | 팝업 목록 / 추가 |
| PUT/PATCH/DELETE | `/api/admin/popups/:id` | 관리자 | 수정 / 노출 여부 변경 / 삭제 |
| DELETE | `/api/admin/content/:key` | 관리자 | 편집 내용 삭제(기본값 복원) |

## 참고

- 관리자 세션은 서명된 JWT(무상태)입니다. 로그아웃하면 브라우저 쿠키가 삭제되지만, 이미 발급된 토큰은 만료(8시간) 전까지 유효합니다. 비밀번호가 유출됐다면 `ADMIN_TOKEN_SECRET`을 바꿔 모든 세션을 무효화합니다.
- 업로드 이미지는 DB에 data URL(최대 약 3MB)로 저장합니다. 이미지를 자주 교체할 계획이라면 Vercel Blob 같은 객체 스토리지를 붙이는 편이 좋습니다.
- 사업개요·유의사항 텍스트는 카탈로그 원문을 추출한 것입니다. 입주자모집공고문이 확정되면 다시 대조해야 합니다.
