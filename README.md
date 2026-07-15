# LocalHub — 서울 지역정보 공유 커뮤니티

공공데이터 기반 익명 지역정보 커뮤니티. **백엔드 서버 없이** 브라우저에서 동작하는 Vue 3 정적 SPA다.
한국관광공사 TourAPI 데이터로 서울의 관광지·문화시설·축제·숙소 등을 탐색하고, 익명 게시판과
AI 챗봇으로 정보를 공유·질의한다.

> SSAFY 3일차 팀프로젝트 · 선정 권역: **서울** · 납기: 2026-07-16

---

## 기술 스택

| 구분 | 내용 |
|------|------|
| 프레임워크 | Vue.js 3 (Composition API, `<script setup>`) |
| 빌드 도구 | Vite 8 |
| 데이터 저장 | 브라우저 `localStorage` (게시글·대화 이력) |
| 관광 데이터 | 정적 JSON (빌드 시 슬림 인덱스 생성) |
| 챗봇 | 프론트엔드에서 OpenAI API 직접 호출 |
| 배포 | Netlify |

**백엔드 서버·데이터베이스 없음.** 모든 처리는 브라우저에서 이루어진다.

---

## 주요 기능

- **관광정보 탐색** — 6개 카테고리(관광지·문화시설·축제공연행사·여행코스·레포츠·숙박) 탭 + 카드 목록
- **익명 게시판** — 회원가입 없이 글 작성/조회/수정/삭제. 수정·삭제는 **작성 시 설정한 비밀번호**로만 가능
- **AI 챗봇** — 제공 데이터 기반 자연어 질의응답(예: "서울 관광지 추천해줘", "박물관 가고 싶어")

---

## 데이터 출처 및 라이선스

이 서비스는 **한국관광공사 Tour API(TourAPI 4.0)** 의 데이터를 활용합니다.

- 출처: 한국관광공사 (https://www.data.go.kr/data/15101578/openapi.do)
- 라이선스: **공공누리 제3유형** (출처 표시 + 변경 금지, 상업적 이용 허용)

> 원본 JSON(`서울_data/`)은 변경 금지 조건에 따라 수정하지 않으며, 가공이 필요한 경우
> 빌드 단계에서 파생 파일(`public/index/`)을 생성한다.

---

## 시작하기

### 요구 사항

- Node.js `^22.18.0 || >=24.12.0`

### 설치 및 실행

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 설정 (챗봇용 OpenAI 키)
cp .env.example .env
#   .env 를 열어 VITE_OPENAI_API_KEY 값을 채운다

# 3. 개발 서버 실행 (슬림 인덱스 생성 후 Vite dev)
npm run dev
```

### 스크립트

| 명령 | 설명 |
|------|------|
| `npm run dev` | 슬림 인덱스 생성 → 개발 서버 |
| `npm run build` | 슬림 인덱스 생성 → 프로덕션 빌드 (`dist/`) |
| `npm run preview` | 빌드 결과물 미리보기 |
| `npm run build:index` | 관광 데이터 슬림 인덱스만 재생성 |

---

## 환경변수

`.env` (커밋 금지 — `.gitignore` 등록됨):

```
VITE_OPENAI_API_KEY=sk-...
VITE_OPENAI_MODEL=gpt-4o-mini
```

> ⚠️ **`VITE_` 접두사 값은 빌드 결과물(JS 번들)에 그대로 포함되어 브라우저에서 노출된다.**
> 백엔드가 없어 구조적으로 은닉이 불가능하므로, 반드시 **사용량 제한이 걸린 키**만 사용하고
> OpenAI 대시보드에서 **결제 한도를 낮게** 설정할 것. 자세한 내용은
> [`docs/plans/mvp-must-have-plan.ko.md`](docs/plans/mvp-must-have-plan.ko.md) §7 참조.

---

## 프로젝트 구조

```
├─ index.html
├─ scripts/
│  └─ build-index.mjs         # 원본 JSON → 슬림 POI 인덱스 생성
├─ 서울_data/                  # 원본 TourAPI JSON (공공누리 3유형, 변경 금지)
│  └─ deferred/               # 범위 제외 데이터(쇼핑) — 빌드에서 무시
├─ public/
│  └─ index/                  # 빌드 생성 슬림 인덱스 (gitignore됨)
├─ src/
│  ├─ App.vue                 # 셸: 헤더·카테고리 탭·목록
│  ├─ components/
│  │  ├─ BoardSection.vue     # 익명 게시판 (localStorage CRUD)
│  │  ├─ ChatPanel.vue        # 챗봇 UI
│  │  └─ PasswordModal.vue    # 수정·삭제 비밀번호 확인
│  └─ chatbot/                # 챗봇 코어 (프레임워크 비의존)
│     ├─ retrieve.js          #   질의 → 관련 POI 검색
│     ├─ context.js           #   검색 결과 → LLM 컨텍스트
│     ├─ openai.js            #   OpenAI 호출
│     └─ ...
└─ docs/plans/                # 구현 계획서 (국문·영문)
```

---

## 아키텍처 노트

- **슬림 인덱스** — 원본 관광 JSON(2,150건)을 빌드 시 필요한 필드만 추린 카테고리별 파일로 가공한다.
  챗봇과 목록이 이 인덱스를 공유하며, 카테고리별로 필요할 때만 로드한다.
- **챗봇 검색** — 전체 데이터를 프롬프트에 넣지 않는다. 브라우저에서 먼저 키워드로 상위 소수 건만
  추려 컨텍스트로 전달해 API 비용을 억제한다.
- **게시글 저장** — `localStorage["localhub:posts:v1"]`. 삭제는 소프트 삭제(`deleted_at`)로 처리한다.

---

## 배포 (Netlify)

1. 저장소를 Netlify에 연동 (빌드 명령: `npm run build`, 배포 디렉터리: `dist`)
2. Netlify 환경변수 UI에서 `VITE_OPENAI_API_KEY` 주입 (`.env`는 배포에 포함하지 않음)
3. 배포 후 URL 동작 확인

---

## ⚠️ 교육 목적 설계 주의

- **게시글 비밀번호는 평문으로 저장·비교된다.** 백엔드가 없는 구조상 의도된 설계이며 실무에서는
  사용하지 말 것.
- **게시글은 작성한 브라우저(기기)의 `localStorage`에만 저장된다.** 다른 사용자와 공유되지 않는다.
- 인증·권한 체계가 없는 **완전 익명** 커뮤니티다.
