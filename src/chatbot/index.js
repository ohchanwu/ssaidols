/**
 * LocalHub 챗봇 — 공개 API.
 *
 * 프레임워크 비의존. Vue 컴포넌트(ChatPanel.vue)는 이 코어를 createChatbot() 으로 감싸 쓴다.
 *
 *   const bot = createChatbot({ apiKey: import.meta.env.VITE_OPENAI_API_KEY })
 *   const reply = await bot.send('경복궁 근처 가볼만한 곳 알려줘')
 */

import { loadCategories } from './poi.js'
import { loadPosts } from './posts.js'
import { retrieve } from './retrieve.js'
import { buildContext } from './context.js'
import { complete, ChatError } from './openai.js'
import { createChatStore } from './store.js'

export { ChatError }
export { CATEGORY } from './poi.js'
export { POSTS_KEY } from './posts.js'
export { CHAT_KEY } from './store.js'

export function createChatbot({
  apiKey = import.meta.env?.VITE_OPENAI_API_KEY,
  model = import.meta.env?.VITE_OPENAI_MODEL || 'gpt-4o-mini',
  baseUrl = '/index',
  k = 8,
  storage = globalThis.localStorage,
} = {}) {
  const store = createChatStore(storage)

  async function send(text, { signal } = {}) {
    const query = text.trim()
    if (!query) return null

    store.add('user', query)

    try {
      // 라우팅된 카테고리만 로드한다 — "숙소 추천"에 관광지 인덱스까지 받아올 이유가 없다.
      const { routed } = retrieve(query, {})
      const pois = await loadCategories(routed, { baseUrl })
      const posts = loadPosts(storage)

      const hits = retrieve(query, { pois, posts, k })
      const context = buildContext(hits)

      const reply = await complete({
        context,
        history: store.messages,
        apiKey,
        model,
        signal,
      })

      const sources = hits.pois.map((p) => ({ id: p.id, name: p.name }))
      return store.add('assistant', reply, sources)
    } catch (err) {
      if (err.name === 'AbortError') throw err
      const message =
        err instanceof ChatError ? err.message : '알 수 없는 오류가 발생했습니다. 다시 시도해 주세요.'
      return store.add('assistant', `⚠️ ${message}`, [])
    }
  }

  return {
    send,
    clear: () => store.clear(),
    get messages() {
      return store.messages
    },
  }
}
