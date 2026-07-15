# 프론트엔드 통합 계획

**작성일:** 2026-07-14 · **대상 브랜치:** `chatbot` ← `origin/feature/frontend-work`

> English version: [`fe-integration-plan.en.md`](./fe-integration-plan.en.md) — 두 버전은 동기화 상태를 유지한다.

## ⚠️ v6 재통합 (최종 — 이 섹션이 우선한다)

FE 팀원이 v2 이후 **v3~v6 을 추가로 푸시**했고(`cfb56d2`), 이는 사실상 **전면 재디자인**이다.
아래 하단 섹션들은 v2 기준 초기 통합 기록이며, **최종 상태는 이 섹션을 따른다.**

**v6 의 변화:**
- **한지(hanji) 테마로 전면 교체** — 기존 보라/골드 → 한지 베이지(`#F4F1EA`)·먹물 차콜·단청 청록(`#2B5B53`), 직각 모서리·도장 그림자.
- **데스크톱 레이아웃** — `max-width: 800px`, 탭 3×2 그리드.
- FE 팀원이 **자체 게시판·챗봇 UI 를 추가**했으나 **둘 다 비기능 껍데기**였다
  (게시판=메모리 전용·비밀번호/영속화 없음, 챗봇=고정 메시지·동작 안 함).

**확정된 재통합 방침 (사용자 결정):**
1. **v6(`cfb56d2`) 디자인이 정본이다.** 한지 테마·레이아웃 그대로 채택.
2. **게시판: "그들의 룩, 나의 기능"** — v6 한지 게시판 스타일 유지 + localStorage CRUD·비밀번호·소프트삭제로 실제 동작하게. RFP III-2 필수 충족.
3. **챗봇: "그들의 룩, 나의 코어"** — v6 한지 챗봇 UI 유지 + 검색·OpenAI 코어 연결.
4. **게시글 스키마 `snake_case`** 유지 (챗봇 posts.js 통합 계약).
5. **Tailwind 제거** — v6 는 Tailwind 없이 scoped CSS 로 설계됨. Preflight 전역 리셋이 한지 테마를 흔들 위험이 있어 제거.

**최종 컴포넌트 구조:**
```
src/App.vue                    ← v6 한지 셸 (탭→슬림인덱스, BoardSection·ChatPanel 마운트)
src/components/BoardSection.vue ← 한지 인라인 게시판 + localStorage CRUD
src/components/ChatPanel.vue    ← 한지 챗봇 UI + createChatbot() 코어
src/components/PasswordModal.vue← 한지 비밀번호 확인 (수정·삭제 공유)
src/chatbot/                    ← 코어 (프레임워크 비의존, 그대로)
```
폐기: `BoardView.vue`·`ChatWidget.vue`(초기 인디고/Tailwind 버전, 대체됨), `board_demo.html`, Tailwind 설정.

> 저장소 구조가 크게 갈라져(그들=중첩 프로젝트, 우리=루트 통합) **재머지 대신 v6 App.vue 설계를
> 우리 구조로 가져오는 방식**으로 통합했다. 커밋 메시지에 v6 출처를 명기.

---

## 확정된 결정 (v2 기준 — 아래는 초기 기록)

1. **`origin/feature/frontend-work` 의 프론트엔드(`ssafy-teamPJT`)가 정본 셸이다.**
2. **`board_demo.html` 은 Vue 컴포넌트로 이식한다.** (폐기 아님, 재작성 아님 — 번역)
3. **게시글 스키마는 `snake_case`** (계획서 §2 계약)로 확정. 이식 중 필드명을 교정한다.
4. **툴체인은 정본 FE 기준 — Vite 8 / `@vitejs/plugin-vue` 6 / Vue 3.5.**

> ℹ️ "Vue 8"은 존재하지 않는다. Vue는 3.x 가 최신이며 RFP도 **Vue.js 3**을 요구한다.
> 8은 **빌드 도구 Vite**의 버전이다. 위 4번이 그 결정을 반영한 것이다.

---

## 1. 현재 상태 (실측)

### 1-1. `chatbot` 브랜치

- **루트 Vite + Vue 앱** — `src/chatbot/`(코어), `src/components/ChatWidget.vue`, `src/dev/`(하네스),
  `scripts/build-index.mjs`, `public/index/`(생성된 슬림 인덱스)
- **`board_demo.html`** — 936줄 단일 HTML. **동작하는 게시판.** 이식 대상.

### 1-2. `origin/feature/frontend-work` (정본 FE)

**분기 지점이 `73a9161 updated skeleton` — 내 챗봇 작업보다 앞선다.**
따라서 `git diff` 상의 대량 "삭제"는 **의도된 삭제가 아니라 그 브랜치에 아직 없는 것**일 뿐이다.
정상 머지하면 내 파일은 지워지지 않는다. (CLAUDE.md도 base 이후 수정 없음 → 충돌 없음)

- 최상위 폴더 **`JSON 데이터 지연 로드/`** (한글 + 공백) 안에 Vue 프로젝트 2개:
  - **`ssafy-teamPJT/`** — **정본.** `v2: 보라색` 커밋이 이것만 수정. App.vue 312줄.
  - `localhub/` — 폐기된 v1 실험. 삭제.
- 각 프로젝트가 관광 JSON 6개를 자기 `public/data/` 에 중복 복사.

### 1-3. 정본 FE 셸이 하는 일

- 헤더 + 탭 내비 + 카드 그리드 + 플로팅 버튼 2개 (글쓰기 / 챗봇)
- `fetchData()` 가 `/data/{파일명}.json` fetch — **원본 TourAPI 스키마** (`data.items`,
  `item.contentid`, `item.firstimage`, `item.addr1`). 우리 슬림 인덱스가 아니다.
- 탭이 **관광지·문화시설 2개뿐** (나머지 4개 카테고리 미사용)
- **`openChatbot()` → `alert(...)`** / **`openPostModal()` → `alert(...)`**
  → 이 두 alert 이 **통합 소켓**이다. FE 팀원이 의도적으로 비워 둔 자리.

---

## 2. `board_demo.html` 이식 분석 (실측)

| 항목 | 실측값 | 의미 |
|------|--------|------|
| 전체 | 936줄 | |
| Vue 로드 방식 | `unpkg.com/vue@3/dist/vue.global.js` (**CDN**) | 제거 필수 |
| 스타일 | `cdn.tailwindcss.com` (**CDN**) | 제거 필수 |
| Tailwind 유틸리티 클래스 | **147개** | 손으로 CSS 변환은 비현실적 |
| 자체 `<style>` | 19줄 | 소량 |
| 스크립트 | Composition API (`ref`/`computed`/`watch`) | **SFC 이식이 대부분 기계적** |

### 2-1. Vue CDN 제거 — 필수

`vue.global.js` 를 남겨 두면 번들의 Vue와 **인스턴스가 2개**가 된다. 반드시 제거하고 번들 Vue를 쓴다.

### 2-2. Tailwind — CDN 제거 후 **정식 설치**

`cdn.tailwindcss.com` 은 브라우저에서 JIT 컴파일하는 **개발 전용** 스크립트다. 프로덕션 번들에 두면 안 된다.

유틸리티 클래스가 147개이므로 **scoped CSS로 손수 변환하는 것은 비현실적**이다(오탈자 위험 + 시간).
→ **Tailwind를 정식 의존성으로 설치한다.** 그러면 클래스 147개를 그대로 두고 이식할 수 있다.

**버전 선택: Tailwind v3.4 (PostCSS 방식) 권장.**
`cdn.tailwindcss.com` 이 렌더링하는 것이 v3 시맨틱이다. v4는 일부 유틸리티가 개명·변경되어
(`shadow-sm`→`shadow-xs` 등) 147개 클래스 전반에 **미묘한 시각적 깨짐**이 날 수 있다.
납기 이틀 전에 감수할 리스크가 아니다. v4는 여유가 생기면 후속 과제로 둔다.

> `ChatWidget.vue` 는 scoped CSS로 작성되어 있다. Tailwind와 공존하는 데 문제 없다.

### 2-3. 컴포넌트 분해

한 파일에 936줄을 그대로 옮기지 않는다. 최소한으로 쪼갠다:

- `BoardView.vue` — 목록 + 상세 + 작성/수정 폼 (컨테이너)
- `PasswordModal.vue` — 비밀번호 확인 모달 (수정·삭제가 **공유**하므로 반드시 분리)

과분해하지 않는다. 납기가 우선이다.

### 2-4. 이식 중 반드시 고칠 것 — 필드명

`board_demo.html` 은 키(`localhub:posts:v1`)와 봉투(`{schemaVersion, posts}`)는 맞췄으나
**필드명이 어긋난다.** 게시판 내부에서도 camelCase와 snake_case를 섞어 쓴다.

| 계약 (§3) | board_demo.html | 조치 |
|---|---|---|
| `post_id` | `id` | 변경 |
| `created_at` | `createdAt` | 변경 |
| `updated_at` | `updatedAt` | 변경 |
| `deleted_at` | `deletedAt` | 변경 |
| `view_count` / `like_count` / `dislike_count` | 동일 | 유지 |

**왜 중요한가:** `src/chatbot/posts.js` 는 `!p.deleted_at` 으로 삭제 글을 거른다.
게시판이 `deletedAt` 을 쓰면 `deleted_at` 은 `undefined` 이고 `!undefined === true` 가 되어
**삭제된 게시글이 필터를 통과해 챗봇 컨텍스트에 실린다.** 에러도 경고도 없이 조용히 실패한다 —
사용자가 지운 글을 챗봇이 인용한다. 시연 중 터지면 치명적이다.

**안전장치:** `posts.js` 에 개발 모드 경고 추가. 저장된 게시글에서 `deletedAt`·`createdAt` 같은
camelCase 필드를 발견하면 콘솔에 크게 경고한다. **조용한 실패를 시끄러운 실패로 바꾼다.**

---

## 3. 게시글 스키마 — `snake_case` 확정

```jsonc
{ schemaVersion: 1, posts: Post[] }        // localStorage["localhub:posts:v1"]

Post {
  post_id        string    // crypto.randomUUID()
  category       string
  title          string    // 1–100자
  content        string    // 1–5000자
  password       string    // 평문 4자 이상 — RFP III-2-나 의도된 설계
  created_at     string    // ISO 8601
  updated_at     string    // ISO 8601
  deleted_at     string    // ISO 8601 | null — 소프트 삭제
  view_count     number
  like_count     number
  dislike_count  number
}
```

`src/chatbot/posts.js` 는 이미 이 스키마 기준이므로 **수정 불필요**(§2-4 경고 추가 제외).

소프트 삭제 필터(`deleted_at === null`)는 **한 곳에만** 둔다. 화면마다 재구현하지 않는다.

---

## 4. 목표 구조

```
/                        ← Vue 앱 하나. Netlify가 이걸 배포한다.
  index.html
  package.json           ← Vite 8 / plugin-vue 6 / Vue 3.5 / Tailwind 3.4
  vite.config.js
  tailwind.config.js     ← 신규
  postcss.config.js      ← 신규
  scripts/build-index.mjs
  서울_data/              ← 원본 (공공누리 3유형, 변경 금지). 단일 원천.
  public/index/          ← 빌드 생성 슬림 인덱스 (gitignore됨)
  src/
    main.js
    style.css            ← @tailwind 지시문
    App.vue              ← 정본 FE 셸 (ssafy-teamPJT/src/App.vue 에서 이동)
    components/
      ChatWidget.vue     ← 기존, 그대로
      BoardView.vue      ← board_demo.html 에서 이식
      PasswordModal.vue  ← board_demo.html 에서 이식
    chatbot/             ← 기존 코어 (프레임워크 비의존, 손대지 않음)
```

**삭제:** `JSON 데이터 지연 로드/` 전체(중복 데이터·`localhub/` 포함), `board_demo.html`(이식 완료 후), `src/dev/`

> ⚠️ 폴더명 `JSON 데이터 지연 로드/` 는 **한글 + 공백**이다. 이번 세션에서도 한글 경로 때문에
> `glob`·`find`·PowerShell이 실패했다. 이 디렉터리는 살려 두지 않는다.

---

## 5. 작업 순서

### Phase 1 — 안전하게 머지

1. `git merge origin/feature/frontend-work` — 충돌 없을 것으로 예상(분기점이 내 작업 이전).
2. **머지 후 `src/chatbot/`·`ChatWidget.vue`·`board_demo.html` 이 그대로 남아 있는지 확인.**
3. 구조 정리는 **별도 커밋**. 머지와 재구성을 한 커밋에 섞지 말 것 — 되돌리기가 불가능해진다.

### Phase 2 — 구조 정리 · 툴체인 단일화

4. `ssafy-teamPJT/src/App.vue` → `src/App.vue`, `src/main.js`·`src/style.css` 작성.
5. `JSON 데이터 지연 로드/` 통째로 삭제. `src/dev/` 삭제. (`board_demo.html` 은 Phase 3 완료 후 삭제)
6. 루트 `package.json` 하나로 통일 — **Vite 8 / plugin-vue 6 / Vue 3.5**.
   Node 요구사항 `>=24.12` → 현재 v24.18 ✓
7. **Tailwind 3.4 설치** + `tailwind.config.js` / `postcss.config.js` / `style.css`.
8. `.gitignore` 에 `.vite/` 추가.

### Phase 3 — 게시판 이식

9. `board_demo.html` → `BoardView.vue` + `PasswordModal.vue` (§2-3).
10. **Vue CDN 제거** — 번들 Vue 사용 (§2-1).
11. **Tailwind CDN `<script>` 제거** — 클래스 147개는 그대로 유지 (§2-2).
12. **필드명 snake_case 교정** (§2-4).
13. `posts.js` 에 camelCase 감지 경고 추가.
14. 이식·검증 완료 후 `board_demo.html` 삭제.

### Phase 4 — 배선

15. `App.vue` 의 `fetchData()` 를 **슬림 인덱스(`/index/{type}.json`)** 로 전환.
    슬림 스키마는 `id/name/addr/img` 이므로 카드 템플릿의 `item.title`·`item.addr1`·`item.firstimage` 도 수정.
16. 탭을 **6개 카테고리 전체**로 확장 (현재 2개뿐).
17. `openChatbot()` alert 제거 → `<ChatWidget />` 마운트.
18. `openPostModal()` alert 제거 → `<BoardView />` 연결.

### Phase 5 — 검증 · 배포

19. `npm run build` 통과. Tailwind 스타일이 CDN 때와 동일하게 나오는지 육안 확인.
20. **회귀 테스트: 게시글을 삭제한 뒤 챗봇에게 그 글을 물어본다 — 나오면 안 된다.** (§2-4)
21. Netlify 연동, **`.env` 미포함 확인**.

---

## 6. 리스크

| 리스크 | 영향 | 대응 |
|--------|------|------|
| 스키마 표기 혼용 | **삭제된 글이 챗봇 답변에 노출** (조용한 실패) | Phase 3-12 교정 + `posts.js` 경고 + Phase 5-20 회귀 테스트 |
| Tailwind CDN → 설치 시 시각적 깨짐 | 레이아웃 붕괴 | **v3.4** 사용(CDN과 동일 시맨틱). v4는 후속 과제 |
| Vue CDN 잔존 | Vue 인스턴스 2개 → 원인불명 버그 | Phase 3-10에서 제거 |
| 앱 3개 / 데이터 3벌 | Netlify 배포 불가, 저장소 비대 | Phase 2에서 단일 앱으로 정리 |
| 한글+공백 폴더명 | 툴체인·CI 깨짐 | 디렉터리 삭제 |
| 머지가 내 작업을 지운 것처럼 보임 | 오판으로 강제 덮어쓰기 | **분기점이 이전일 뿐이다.** 절대 `--ours`/force 금지 |
