/**
 * 대화 상태 + localStorage 영속화.
 *
 * Pinia 가 아니라 순수 JS 다. 팀원의 Vue 앱에 그대로 복사해 붙일 수 있어야 하므로
 * src/chatbot/ 안의 어떤 파일도 프레임워크를 import 하지 않는다.
 */

import { MAX_HISTORY } from './openai.js'

export const CHAT_KEY = 'localhub:chat:v1'
const SCHEMA_VERSION = 1

const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? `m_${Math.random().toString(36).slice(2)}${Date.now()}`

export function createChatStore(storage = globalThis.localStorage) {
  let messages = load()

  function load() {
    try {
      const raw = storage?.getItem(CHAT_KEY)
      if (!raw) return []
      const parsed = JSON.parse(raw)
      if (parsed?.schemaVersion !== SCHEMA_VERSION) return []
      return Array.isArray(parsed.messages) ? parsed.messages : []
    } catch {
      return []
    }
  }

  function persist() {
    try {
      storage?.setItem(
        CHAT_KEY,
        JSON.stringify({ schemaVersion: SCHEMA_VERSION, messages: messages.slice(-MAX_HISTORY) }),
      )
    } catch (err) {
      // 할당량 초과 등. 대화는 메모리에 남아 있으므로 기능은 계속 동작한다.
      console.warn('[chatbot] 대화 저장 실패:', err?.message)
    }
  }

  return {
    get messages() {
      return messages
    },
    add(role, content, sources = []) {
      const message = { id: uid(), role, content, created_at: new Date().toISOString(), sources }
      messages = [...messages, message].slice(-MAX_HISTORY)
      persist()
      return message
    },
    clear() {
      messages = []
      persist()
    },
  }
}
