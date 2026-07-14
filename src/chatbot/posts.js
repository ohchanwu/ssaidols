/**
 * 커뮤니티 게시글 검색 소스.
 *
 * RFP III-3-나가 챗봇 질의 유형으로 "커뮤니티 게시글 검색"을 명시하므로,
 * 챗봇은 POI 인덱스와 localStorage 게시글 두 곳을 함께 검색한다.
 *
 * ⚠️ 게시판은 팀원이 별도로 개발 중이다. 아래 키·스키마가 팀 간 통합 계약이며,
 *    게시판 쪽이 다른 키를 쓰면 게시글 검색이 조용히 실패한다.
 *    (docs/plans/mvp-must-have-plan.ko.md §2)
 *
 * 게시판이 아직 없거나 스키마가 다르면 빈 배열을 반환하고 POI 검색만으로 동작한다.
 */

export const POSTS_KEY = 'localhub:posts:v1'

let camelWarned = false

/**
 * 게시판이 camelCase 필드(deletedAt 등)로 저장하면 소프트 삭제 필터(`!p.deleted_at`)가
 * 조용히 무력화되어 삭제된 글이 챗봇에 새어 나온다. 조용한 실패를 시끄럽게 만든다.
 * (docs/plans/fe-integration-plan.ko.md §2-4)
 */
function warnOnCamelCase(posts) {
  if (camelWarned) return
  const CAMEL = ['deletedAt', 'createdAt', 'updatedAt', 'postId']
  const offender = posts.find((p) => p && CAMEL.some((k) => k in p))
  if (offender) {
    camelWarned = true
    const found = CAMEL.filter((k) => k in offender)
    console.error(
      `[chatbot] 🔴 게시글 스키마 위반: camelCase 필드 발견 [${found.join(', ')}]. ` +
        `계약은 snake_case(deleted_at 등)입니다. 소프트 삭제 필터가 무력화되어 ` +
        `삭제된 글이 챗봇 답변에 노출될 수 있습니다. 게시판 저장 코드를 확인하세요.`,
    )
  }
}

export function loadPosts(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(POSTS_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    const posts = Array.isArray(parsed) ? parsed : parsed?.posts

    if (!Array.isArray(posts)) return []

    warnOnCamelCase(posts)

    // deleted_at 이 채워진 글은 소프트 삭제된 글이다. 절대 노출하지 않는다.
    return posts.filter((p) => p && !p.deleted_at && typeof p.title === 'string')
  } catch (err) {
    console.warn('[chatbot] 게시글 로드 실패 — POI 검색만 사용합니다:', err?.message)
    return []
  }
}
