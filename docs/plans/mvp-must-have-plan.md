# LocalHub MVP — Must Have 구현 계획

**선정 권역:** 서울 · **납기:** 2026-07-16 (목) 15:00 · **작성일:** 2026-07-14

이 문서는 실습기획서 `4_MVP정의(실습)` 시트의 **Must have** 범위를 구현하기 위한 데이터 스키마와
저장소 아키텍처를 확정한다. 선택기능(지도 등)은 별도 문서에서 다룬다.

---

## 1. 저장소 아키텍처 결정

| 데이터 | 저장 위치 | 근거 |
|--------|----------|------|
| 게시글 | **localStorage** | RFP III-2-나가 명시. 작고 가변적이며 사용자 소유 데이터. 동기 접근으로 CRUD 코드가 단순해짐 |
| 챗봇 대화 이력 | **localStorage** | 최근 30개로 제한 — 수십 KB 수준 |
| POI 관광 데이터 | **정적 JSON → 메모리** | 불변·읽기 전용 데이터. HTTP 캐시가 영속성을 무료로 제공 |

### IndexedDB를 쓰지 않는 이유

검토했으나 이 데이터에는 부적합하다고 판단했다.

1. **정적·읽기 전용 데이터다.** 빌드 산출물로 함께 배포되므로 브라우저 HTTP 캐시와 Netlify CDN이
   이미 영속성과 선택적 로딩을 코드 0줄로 제공한다. IndexedDB는 *가변* 클라이언트 상태를 위한 도구다.
2. **필요한 질의를 지원하지 못한다.** IndexedDB 인덱스는 정확일치·범위 질의만 가능하고
   **부분 문자열/전문 검색을 지원하지 않는다.** 챗봇의 질의는 "`title`/`addr`에 '경복궁'이 포함된 항목"
   같은 부분 문자열 매칭이므로 결국 전체 커서 스캔이 되며, 이는 JS 배열 스캔보다 느리고 코드만 늘어난다.
3. **애초에 크지 않다.** 슬림 인덱스 적용 시 5.61MB → **1.93MB (−66%)**. 쇼핑(1,330KB)을 제외하면
   **약 600KB**. 메모리에 그대로 올려도 무방한 크기다.

> **다시 검토할 조건:** 의미 검색(임베딩)을 추가하게 되면 6,518건의 벡터를 클라이언트에 영속화할
> 가치가 생기므로 그때 IndexedDB를 재검토한다. MVP 범위는 아니다.

### ⚠️ localStorage 용량 주의

- localStorage 할당량은 오리진당 **약 5MB** (10MB 아님).
- 문자열이 **UTF-16**으로 저장되므로 한글은 **문자당 2바이트**를 소비한다.
- **POI 인덱스를 localStorage에 캐시하지 말 것.** 슬림 인덱스(1.93MB)조차 UTF-16 환산 시 약 3.9MB로
  할당량의 대부분을 잡아먹고, 원본(5.61MB)은 즉시 초과한다. POI는 메모리에만 둔다.
- 실제 사용량: 게시글 + 대화 이력 = **1MB 미만**. 여유 충분.

---

## 2. 게시글 스키마

`localStorage["localhub:posts:v1"]` — 게시글 하나당 키를 만들지 않고, 전체 배열을 버전 봉투에 담아 단일 키로 저장한다.

```jsonc
{ schemaVersion: 1, posts: Post[] }

Post {
  post_id        string    // PK — crypto.randomUUID()
  category       string    // 게시판 카테고리
  title          string    // 1–100자
  content        string    // 1–5000자
  password       string    // 평문 4자 이상 — RFP III-2-나 의도된 설계 (서버가 없어 암호화 없이 저장·비교)
  created_at     string    // ISO 8601
  updated_at     string    // ISO 8601
  deleted_at     string    // ISO 8601 | null — 소프트 삭제
  view_count     number
  like_count     number
  dislike_count  number
}
```

**설계 노트**

- `deleted_at`은 소프트 삭제다. **목록·상세 조회 시 반드시 `deleted_at === null` 필터를 걸 것.**
  이 필터를 한 곳(store의 getter)에만 두고 화면에서 개별 처리하지 않는다.
- `view_count` / `like_count` / `dislike_count`는 **선택기능(Could) 범위**다. 다만 필드를 지금 넣어두면
  나중에 스키마 마이그레이션 없이 기능만 붙일 수 있으므로 스키마에는 미리 포함한다. 초기값 `0`.
- 와이어프레임(RFP 참고4 ②)의 게시글 **번호**는 저장하지 않는다. 목록 렌더링 시 인덱스로 파생시킨다.
  (저장하면 삭제 시 번호가 어긋난다)
- `schemaVersion`은 저장 포맷 변경 시 마이그레이션 분기점으로 쓴다.

---

## 3. POI 인덱스 스키마 (챗봇 + 지도 공용)

원본 JSON은 **공공누리 3유형에 따라 변경 금지**이므로, 빌드 단계에서 **파생 파일**을 생성한다.
원본은 손대지 않는다.

`scripts/build-index.mjs` → `public/index/{contentTypeId}.json`

```jsonc
{ contentTypeId, contentType, total, items: Poi[] }

Poi {
  id    string   // contentid
  type  string   // contenttypeid (12/14/15/25/28/32/38)
  name  string   // title       — 100% 충족
  addr  string   // addr1       — 99.2% 충족
  lat   number   // parseFloat(mapy) — 원본은 string이므로 빌드 시 숫자 변환
  lng   number   // parseFloat(mapx)
  img   string   // firstimage  — "" 이면 이미지 없음 (94.3% 충족)
  l1    string   // lclsSystm1  — 카테고리 필터 키 (100% 충족)
  l2    string   // lclsSystm2
}
```

**필드 선정 근거 (실측)**

- ❌ `tel` 제외 — **3.1%만 채워져 있다.** 지도 팝업·상세정보에 전화번호를 넣지 말 것.
- ❌ `cat1`/`cat2`/`cat3` 제외 — **22%만 채워져 있고** 코드표(`lclsSystemCode.json`)도 저장소에 없다.
- ✅ 필터는 **`lclsSystm1`/`lclsSystm2`**(100% 충족) 또는 `contenttypeid`를 사용한다.
  `lclsSystm1` 실제 값: `AC`, `C01`, `EV`, `EX`, `HS`, `LS`, `NA`, `SH`, `VE`

**런타임 로딩**

- 카테고리별로 **필요할 때만** `fetch()` 하고 Pinia store에 메모이즈한다. 전량 eager-load 금지.
- `서울_쇼핑.json` 하나가 원본 3.9MB(전체의 69%)다. **쇼핑은 후순위로 미루거나 범위에서 제외 검토.**

---

## 4. 챗봇 스키마 및 검색 계약

### 대화 상태 — `localStorage["localhub:chat:v1"]`

```jsonc
{ schemaVersion: 1, messages: Message[] }   // 최근 30개로 제한

Message {
  id          string
  role        'user' | 'assistant'
  content     string
  created_at  string              // ISO 8601
  sources     { id, name }[]?     // 인용한 POI — 발표 시 신뢰도 어필 포인트
}
```

### 검색 계약 (API 예산을 지키는 핵심)

```
retrieve(query: string): Poi[]        // 상위 6건 (K=6)
  → buildContext(pois): string        // POI 1건당 1줄로 압축
  → OpenAI chat/completions 호출      // system + context + 최근 N개 메시지
```

- **6,518건을 통째로 프롬프트에 넣지 말 것.** 브라우저에서 먼저 키워드 필터링해 상위 소수 건만 전달한다.
- 상한: POI **6건**, 대화 이력 **30개**, 토큰 가드 필수.
- `VITE_` 접두사 환경변수는 빌드 결과물에 노출된다. **사용량 제한이 걸린 키만** 사용하고 결제 한도를 낮게 설정.

---

## 5. 데이터 리스크 (기능 명세서에 기재 필요)

| 리스크 | 내용 | 대응 |
|--------|------|------|
| 음식점 데이터 부재 | `서울_음식점.json`이 **디스크에 없다.** SOURCE.md는 1,632건이 있다고 기재 | RFP가 명시한 챗봇 질의 유형 "모범음식점 위치" **응답 불가**. 착수 전 고객사(교수)에 파일 요청. 맛집 기능은 전제하지 말 것 |
| 축제 일정 필드 부재 | 축제 JSON에 `eventstartdate`/`eventenddate`가 **없다** (201건 전부). `createdtime`/`modifiedtime`만 존재 | **"축제 캘린더" 선택기능은 제공 데이터만으로 구현 불가.** 선택기능 후보에서 제외 |
| 대용량 단일 파일 | `서울_쇼핑.json` 3.9MB / 4,368건 | 지연 로드 필수. 범위 제외 검토 |
| 라이선스 | 공공누리 제3유형 (출처 표시 + **변경 금지**) | 앱에 "한국관광공사" 및 원본 API URL 표기. 원본 JSON 수정 금지 — 파생 파일로만 가공 |

---

## 6. 작업 순서

**Day 1 (7/14)** — 기획·설계
1. 실습기획서 `4_MVP정의(실습)` Must have 확정 ← **현재 작업**
2. 본 문서의 스키마 확정
3. Vite + Vue 3 프로젝트 스캐폴딩, `.env` + `.gitignore` 등록 (첫 커밋 전 필수)

**Day 2 (7/15)** — 개발
4. `scripts/build-index.mjs` — 슬림 POI 인덱스 생성
5. 게시글 store (localStorage CRUD + 비밀번호 대조 + 소프트 삭제 필터)
6. 게시판 화면 4종 (목록 / 상세 / 작성·수정 / 비밀번호 확인 모달)
7. 챗봇 — 검색 함수 → 컨텍스트 빌더 → OpenAI 호출 → 플로팅 채팅 UI

**Day 3 (7/16)** — 마무리
8. Netlify 배포 (repo 연동) 및 배포 URL 동작 확인, **`.env` 미포함 확인**
9. 통합 테스트 및 버그 수정
10. 기능명세서(데이터 출처·라이선스 목록 포함) · WBS · 발표 PPT
