/**
 * POI 인덱스 로더. 카테고리별로 필요할 때만 fetch 하고 메모리에 캐시한다.
 *
 * localStorage 에 캐시하지 않는다 — HTTP 캐시가 이미 같은 일을 하고 있고,
 * 게시글이 써야 할 할당량만 잠식한다. (docs/plans/mvp-must-have-plan.ko.md §1)
 */

export const CATEGORY = {
  12: '관광지',
  14: '문화시설',
  15: '축제공연행사',
  25: '여행코스',
  28: '레포츠',
  32: '숙박',
}

export const ALL_TYPES = Object.keys(CATEGORY)

const cache = new Map()
const inflight = new Map()

/** 카테고리 하나를 로드한다. 동시 호출되어도 fetch 는 한 번만 나간다. */
export async function loadCategory(type, { baseUrl = '/index' } = {}) {
  if (cache.has(type)) return cache.get(type)
  if (inflight.has(type)) return inflight.get(type)

  const promise = fetch(`${baseUrl}/${type}.json`)
    .then((res) => {
      if (!res.ok) throw new Error(`POI 인덱스 로드 실패 (${type}): ${res.status}`)
      return res.json()
    })
    .then((data) => {
      cache.set(type, data.items)
      inflight.delete(type)
      return data.items
    })
    .catch((err) => {
      inflight.delete(type)
      throw err
    })

  inflight.set(type, promise)
  return promise
}

/** 여러 카테고리를 병렬 로드해 하나의 배열로 합친다. 실패한 카테고리는 건너뛴다. */
export async function loadCategories(types, opts) {
  const results = await Promise.allSettled(types.map((t) => loadCategory(t, opts)))
  return results.flatMap((r, i) => {
    if (r.status === 'fulfilled') return r.value
    console.warn(`[chatbot] ${CATEGORY[types[i]]} 인덱스 로드 실패:`, r.reason?.message)
    return []
  })
}
