/**
 * OpenAI Chat Completions 직접 호출 (백엔드 없음 — RFP III-3-가).
 *
 * openai SDK 대신 fetch 를 쓴다. SDK를 브라우저에서 쓰려면 dangerouslyAllowBrowser 를 켜야 하고
 * 번들만 커진다. 우리가 필요한 건 엔드포인트 하나뿐이다.
 *
 * ⚠️ VITE_ 값은 빌드 결과물에 그대로 박힌다. 키는 브라우저에서 노출되며 이는 백엔드가 없는 이상
 *    구조적으로 막을 수 없다. 사용량 제한 키 + 낮은 결제 한도가 유일한 방어다. (계획서 §7)
 */

import { SYSTEM_PROMPT } from './context.js'

const ENDPOINT = 'https://api.openai.com/v1/chat/completions'

/** 대화 이력 상한. 넘으면 오래된 것부터 버린다 — 토큰 폭주 방지. */
export const MAX_HISTORY = 30

export class ChatError extends Error {
  constructor(message, { status, cause } = {}) {
    super(message)
    this.name = 'ChatError'
    this.status = status
    this.cause = cause
  }
}

function friendlyError(status, body) {
  if (status === 401) return 'API 키가 유효하지 않습니다. .env 의 VITE_OPENAI_API_KEY 를 확인하세요.'
  if (status === 429) return '요청이 너무 많거나 사용 한도를 초과했습니다. 잠시 후 다시 시도하세요.'
  if (status >= 500) return 'OpenAI 서버 오류입니다. 잠시 후 다시 시도하세요.'
  return body?.error?.message || `요청에 실패했습니다 (HTTP ${status}).`
}

/**
 * @param {{context: string, history: object[], apiKey: string, model?: string, signal?: AbortSignal}} opts
 * @returns {Promise<string>} assistant 응답 텍스트
 */
export async function complete({ context, history, apiKey, model = 'gpt-5-mini', signal }) {
  if (!apiKey) {
    throw new ChatError('API 키가 설정되지 않았습니다. .env.example 을 .env 로 복사하고 키를 채우세요.')
  }

  const trimmed = history.slice(-MAX_HISTORY)
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'system', content: context },
    ...trimmed.map((m) => ({ role: m.role, content: m.content })),
  ]

  let res
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      // GPT-5 계열(추론 모델) 파라미터:
      //  - max_tokens 미지원 → max_completion_tokens 사용 (gpt-4o 계열도 허용)
      //  - temperature 는 기본값(1)만 허용 → 커스텀 값 보내지 않음
      //  - reasoning_effort 'minimal': RAG 용도이므로 내부 추론을 최소화(속도·비용↓,
      //    추론 토큰이 답변 몫을 잠식해 빈 응답이 나오는 것을 방지)
      body: JSON.stringify({
        model,
        messages,
        max_completion_tokens: 1024,
        reasoning_effort: 'minimal',
      }),
    })
  } catch (err) {
    if (err.name === 'AbortError') throw err
    throw new ChatError('네트워크 오류로 요청에 실패했습니다.', { cause: err })
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new ChatError(friendlyError(res.status, body), { status: res.status })
  }

  const data = await res.json()
  const text = data.choices?.[0]?.message?.content?.trim()
  if (!text) throw new ChatError('빈 응답을 받았습니다.')

  return text
}
