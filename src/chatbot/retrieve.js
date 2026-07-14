/**
 * 질의 → 관련 POI/게시글 상위 K건.
 *
 * 순수 함수다. fetch 도 API 키도 필요 없으므로 단독으로 테스트할 수 있다.
 *
 * 왜 단순 부분문자열 매칭이 아닌가:
 *   RFP가 명시한 질의 유형은 대부분 "관광지 추천해줘" 같은 **카테고리성** 질문이지
 *   "경복궁 어디야" 같은 개체 조회가 아니다. "관광지"라는 이름을 가진 POI는 없으므로
 *   title.includes(query) 방식은 RFP의 주요 질의 유형 전부에서 0건을 반환한다.
 *   따라서 [카테고리 라우팅] ∪ [개체 부분문자열 매칭] 의 하이브리드로 구성한다.
 */

import { CATEGORY, ALL_TYPES } from './poi.js'

/** 질의어에서 카테고리를 추론하기 위한 키워드 맵. */
const CATEGORY_KEYWORDS = {
  12: ['관광', '관광지', '명소', '가볼만한', '가볼만', '고궁', '궁궐', '궁', '공원', '한강', '야경', '나들이', '데이트', '산책', '전망'],
  14: ['문화', '문화시설', '박물관', '미술관', '전시', '갤러리', '도서관', '기념관', '과학관', '공연장'],
  15: ['축제', '행사', '공연', '페스티벌', '콘서트', '뮤지컬', '연극', '이벤트'],
  25: ['코스', '여행코스', '루트', '동선', '당일치기', '1박2일', '일정짜'],
  28: ['레포츠', '액티비티', '체험', '등산', '자전거', '수영', '캠핑', '스키', '골프', '낚시', '스포츠'],
  32: ['숙박', '숙소', '호텔', '모텔', '게스트하우스', '펜션', '한옥', '묵을', '잘곳', '머물'],
}

/** 데이터가 아예 없는 주제 — 환각을 막기 위해 별도로 감지해 시스템 프롬프트에 경고를 넣는다. */
const UNSUPPORTED = {
  restaurant: ['맛집', '음식점', '식당', '먹거리', '먹을', '카페', '맛있', '메뉴', '모범음식점'],
  shopping: ['쇼핑', '백화점', '아울렛', '면세점', '기념품'],
  schedule: ['일정', '언제', '날짜', '몇월', '몇일', '기간', '개최'],
}

const STOPWORDS = new Set([
  '추천', '알려줘', '알려', '해줘', '해', '좀', '뭐', '뭔가', '어디', '어떤', '있어', '있나', '없나',
  '서울', '서울시', '주세요', '주라', '싶어', '싶은', '가고', '보고', '하고', '그리고', '근처',
])

const tokenize = (q) =>
  q
    .toLowerCase()
    .split(/[\s,./?!·~()[\]"'’“”]+/)
    .map((t) => t.replace(/(을|를|이|가|은|는|의|에|에서|으로|로|과|와|랑|이랑)$/, ''))
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t))

/**
 * 질의에 걸리는 카테고리를 찾는다.
 *
 * matched=false 면 카테고리 라우팅 점수를 주지 않는다. 이게 중요하다 —
 * 안 그러면 "모범음식점 추천해줘"(=데이터 없음)에 전체 카테고리가 걸려 모든 POI가 +2점을 받고,
 * 정렬이 무의미해져 한강공원 같은 무관한 장소가 컨텍스트에 실린다.
 * 그 상태로 LLM에 넘기면 공원을 음식점처럼 소개하는 환각이 나온다.
 * 매칭이 없으면 이름/주소 토큰 매칭만으로 승부하고, 그래도 없으면 0건을 반환하는 게 맞다.
 */
export function routeCategories(query) {
  const q = query.toLowerCase()
  const hits = Object.entries(CATEGORY_KEYWORDS)
    .filter(([, words]) => words.some((w) => q.includes(w)))
    .map(([type]) => type)
  return { types: hits.length > 0 ? hits : ALL_TYPES, matched: hits.length > 0 }
}

/** 제공 데이터로 답할 수 없는 주제를 감지한다. */
export function detectUnsupported(query) {
  const q = query.toLowerCase()
  return Object.entries(UNSUPPORTED)
    .filter(([, words]) => words.some((w) => q.includes(w)))
    .map(([topic]) => topic)
}

function scorePoi(poi, tokens, route) {
  let score = 0
  const name = poi.name.toLowerCase()
  const addr = (poi.addr || '').toLowerCase()

  for (const t of tokens) {
    if (name.includes(t)) score += 10
    else if (addr.includes(t)) score += 3
  }

  // 카테고리만 걸린 질의("관광지 추천해줘")는 이름 매칭이 0건이므로 라우팅 점수로 살린다.
  // matched=false 일 때는 주지 않는다 — 위 routeCategories 주석 참조.
  if (route.matched && route.types.includes(poi.type)) score += 2

  // 동점일 때 이미지가 있는 항목을 앞세운다 — 카드 UI가 비지 않는다.
  if (score > 0 && poi.img) score += 0.5

  return score
}

function scorePost(post, tokens) {
  let score = 0
  const title = post.title.toLowerCase()
  const content = (post.content || '').toLowerCase()

  for (const t of tokens) {
    if (title.includes(t)) score += 12
    else if (content.includes(t)) score += 4
  }
  return score
}

/**
 * @param {string} query
 * @param {{pois: object[], posts?: object[], k?: number}} sources
 * @returns {{pois: object[], posts: object[], routed: string[], unsupported: string[]}}
 */
export function retrieve(query, { pois = [], posts = [], k = 8 } = {}) {
  const tokens = tokenize(query)
  const route = routeCategories(query)
  const unsupported = detectUnsupported(query)

  const topPois = pois
    .map((p) => ({ poi: p, score: scorePoi(p, tokens, route) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((x) => x.poi)

  // 게시글은 명시적 키워드가 있을 때만 — 카테고리 라우팅 점수를 주지 않는다.
  const topPosts = posts
    .map((p) => ({ post: p, score: scorePost(p, tokens) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => x.post)

  return { pois: topPois, posts: topPosts, routed: route.types, unsupported }
}

export { CATEGORY }
