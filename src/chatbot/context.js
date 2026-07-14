/**
 * 검색 결과 → LLM에 넣을 컨텍스트 문자열.
 *
 * POI 1건당 1줄로 압축한다. 2,149건을 통째로 넣지 않는 것이 API 예산을 지키는 핵심이다.
 * (docs/plans/mvp-must-have-plan.ko.md §4)
 */

import { CATEGORY } from './poi.js'

/** 데이터에 아예 없는 주제 — 모델이 지어내지 못하도록 명시적으로 알린다. */
const UNSUPPORTED_NOTE = {
  restaurant: '음식점·맛집 데이터는 제공되지 않았다. 맛집을 추천하거나 지어내지 말고, 해당 정보가 없다고 답할 것.',
  shopping: '쇼핑 데이터는 이번 서비스 범위에서 제외되었다. 쇼핑 장소를 지어내지 말 것.',
  schedule: '축제·행사의 날짜/기간 데이터는 제공되지 않았다. 일정을 절대 추측하거나 지어내지 말고, 행사 이름과 장소만 안내하고 일정 정보는 없다고 답할 것.',
}

export const SYSTEM_PROMPT = `너는 서울 지역정보 커뮤니티 'LocalHub'의 안내 챗봇이다.

규칙:
- 아래 [데이터]에 있는 내용만 근거로 답한다. 데이터에 없는 장소·주소·일정·전화번호를 절대 지어내지 않는다.
- 데이터가 없으면 "제공된 데이터에 해당 정보가 없습니다"라고 솔직히 답한다. 추측하지 않는다.
- 장소를 추천할 때는 이름과 주소를 함께 알려준다.
- 한국어로, 간결하고 친근하게 답한다. 3~5개 항목 이내로 정리한다.
- 출처는 한국관광공사 TourAPI 데이터다.`

export function buildContext({ pois = [], posts = [], unsupported = [] }) {
  const parts = []

  for (const topic of unsupported) {
    if (UNSUPPORTED_NOTE[topic]) parts.push(`[주의] ${UNSUPPORTED_NOTE[topic]}`)
  }

  if (pois.length > 0) {
    const lines = pois.map(
      (p) => `- ${p.name} (${CATEGORY[p.type] ?? p.type}) | ${p.addr || '주소 미제공'}`,
    )
    parts.push(`[데이터: 장소 ${pois.length}건]\n${lines.join('\n')}`)
  }

  if (posts.length > 0) {
    const lines = posts.map((p) => {
      const body = (p.content || '').replace(/\s+/g, ' ').slice(0, 80)
      return `- "${p.title}" — ${body}${body.length >= 80 ? '…' : ''}`
    })
    parts.push(`[데이터: 커뮤니티 게시글 ${posts.length}건]\n${lines.join('\n')}`)
  }

  if (pois.length === 0 && posts.length === 0) {
    parts.push('[데이터] 질의에 해당하는 장소나 게시글을 찾지 못했다. 데이터가 없다고 안내할 것.')
  }

  return parts.join('\n\n')
}
