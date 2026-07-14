<!--
  LocalHub 챗봇 위젯 — 플로팅 버튼 + 대화창. 모바일에서는 전체 화면. (RFP III-3-다)

  Vue를 아는 유일한 파일이다. src/chatbot/ 코어는 프레임워크에 의존하지 않으므로,
  팀원의 앱에 붙일 때는 src/chatbot/ 를 복사하고 이 컴포넌트를 레이아웃에 얹으면 된다.
-->
<script setup>
import { ref, reactive, nextTick, onMounted, computed, watch } from 'vue'
import { createChatbot } from '../chatbot/index.js'

/**
 * standalone(기본): 자체 플로팅 버튼(FAB)을 띄운다. 다른 프로젝트에 그대로 붙일 때 쓰는 모드.
 * 제어 모드: standalone=false + v-model:open. 부모(셸)가 자기 버튼으로 열림 상태를 쥔다.
 *   → 셸이 이미 테마에 맞는 챗봇 버튼을 갖고 있어, FAB 두 개가 생기는 것을 막는다.
 */
const props = defineProps({
  standalone: { type: Boolean, default: true },
  open: { type: Boolean, default: false },
})
const emit = defineEmits(['update:open'])

const bot = createChatbot()

const internalOpen = ref(false)
const open = computed({
  get: () => (props.standalone ? internalOpen.value : props.open),
  set: (v) => {
    if (props.standalone) internalOpen.value = v
    else emit('update:open', v)
  },
})
watch(open, (v) => {
  if (v) scrollToBottom()
})

const input = ref('')
const busy = ref(false)
const listEl = ref(null)
const messages = reactive([...bot.messages])

const SUGGESTIONS = ['서울 관광지 추천해줘', '박물관 가고 싶어', '숙소 추천해줘', '축제 뭐 있어?']

async function scrollToBottom() {
  await nextTick()
  if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight
}

async function send(text = input.value) {
  const query = text.trim()
  if (!query || busy.value) return

  input.value = ''
  busy.value = true
  messages.push({ id: `tmp_${Date.now()}`, role: 'user', content: query, sources: [] })
  scrollToBottom()

  await bot.send(query)

  // 코어가 사용자 메시지 + 응답을 모두 저장하므로, 임시 메시지를 버리고 정본으로 교체한다.
  messages.splice(0, messages.length, ...bot.messages)
  busy.value = false
  scrollToBottom()
}

function clear() {
  bot.clear()
  messages.splice(0, messages.length)
}

function toggle() {
  open.value = !open.value
  if (open.value) scrollToBottom()
}

onMounted(scrollToBottom)
</script>

<template>
  <div class="lh-chat">
    <button
      v-if="standalone && !open"
      class="lh-fab"
      type="button"
      aria-label="챗봇 열기"
      @click="toggle"
    >
      💬
    </button>

    <section v-if="open" class="lh-panel" role="dialog" aria-label="LocalHub 챗봇">
      <header class="lh-head">
        <strong>LocalHub 챗봇</strong>
        <div class="lh-head-actions">
          <button type="button" class="lh-icon" title="대화 지우기" @click="clear">↺</button>
          <button type="button" class="lh-icon" aria-label="닫기" @click="toggle">✕</button>
        </div>
      </header>

      <div ref="listEl" class="lh-list">
        <p v-if="messages.length === 0" class="lh-empty">
          안녕하세요! 서울의 관광지·문화시설·축제·숙소 정보를 안내해 드립니다.
        </p>

        <div v-for="m in messages" :key="m.id" class="lh-msg" :class="`lh-${m.role}`">
          <div class="lh-bubble">{{ m.content }}</div>
          <ul v-if="m.sources?.length" class="lh-sources">
            <li v-for="s in m.sources" :key="s.id">{{ s.name }}</li>
          </ul>
        </div>

        <div v-if="busy" class="lh-msg lh-assistant">
          <div class="lh-bubble lh-typing"><span></span><span></span><span></span></div>
        </div>
      </div>

      <div v-if="messages.length === 0" class="lh-suggest">
        <button v-for="s in SUGGESTIONS" :key="s" type="button" @click="send(s)">{{ s }}</button>
      </div>

      <form class="lh-form" @submit.prevent="send()">
        <input
          v-model="input"
          type="text"
          placeholder="메시지를 입력하세요"
          :disabled="busy"
          aria-label="메시지 입력"
        />
        <button type="submit" :disabled="busy || !input.trim()">전송</button>
      </form>

      <footer class="lh-foot">출처: 한국관광공사 TourAPI · 공공누리 제3유형</footer>
    </section>
  </div>
</template>

<style scoped>
.lh-chat { position: fixed; right: 24px; bottom: 24px; z-index: 9999; }

.lh-fab {
  width: 56px; height: 56px; border: none; border-radius: 50%;
  background: #2563eb; color: #fff; font-size: 24px; cursor: pointer;
  box-shadow: 0 6px 20px rgb(0 0 0 / 0.18);
}
.lh-fab:hover { background: #1d4ed8; }

.lh-panel {
  display: flex; flex-direction: column;
  width: 380px; height: 560px; max-height: calc(100vh - 48px);
  background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; overflow: hidden;
  box-shadow: 0 12px 40px rgb(0 0 0 / 0.18);
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
}

.lh-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 14px; background: #2563eb; color: #fff;
}
.lh-head-actions { display: flex; gap: 4px; }
.lh-icon {
  background: transparent; border: none; color: #fff;
  font-size: 16px; cursor: pointer; padding: 4px 8px; border-radius: 6px;
}
.lh-icon:hover { background: rgb(255 255 255 / 0.18); }

.lh-list { flex: 1; overflow-y: auto; padding: 14px; background: #f8fafc; }
.lh-empty { color: #64748b; font-size: 14px; line-height: 1.6; margin: 8px 0; }

.lh-msg { margin-bottom: 12px; display: flex; flex-direction: column; }
.lh-user { align-items: flex-end; }
.lh-assistant { align-items: flex-start; }

.lh-bubble {
  max-width: 85%; padding: 10px 13px; border-radius: 12px;
  font-size: 14px; line-height: 1.6; white-space: pre-wrap; word-break: break-word;
}
.lh-user .lh-bubble { background: #2563eb; color: #fff; border-bottom-right-radius: 3px; }
.lh-assistant .lh-bubble { background: #fff; border: 1px solid #e5e7eb; color: #0f172a; border-bottom-left-radius: 3px; }

.lh-sources {
  margin: 6px 0 0; padding: 0; list-style: none;
  display: flex; flex-wrap: wrap; gap: 4px; max-width: 85%;
}
.lh-sources li {
  font-size: 11px; color: #475569; background: #e2e8f0;
  padding: 2px 7px; border-radius: 999px;
}

.lh-typing { display: flex; gap: 4px; padding: 13px; }
.lh-typing span {
  width: 6px; height: 6px; border-radius: 50%; background: #94a3b8;
  animation: lh-blink 1.4s infinite both;
}
.lh-typing span:nth-child(2) { animation-delay: 0.2s; }
.lh-typing span:nth-child(3) { animation-delay: 0.4s; }
@keyframes lh-blink { 0%, 80%, 100% { opacity: 0.3 } 40% { opacity: 1 } }

.lh-suggest { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 14px 10px; background: #f8fafc; }
.lh-suggest button {
  font-size: 12px; padding: 6px 10px; border-radius: 999px;
  border: 1px solid #cbd5e1; background: #fff; color: #334155; cursor: pointer;
}
.lh-suggest button:hover { background: #eff6ff; border-color: #2563eb; color: #2563eb; }

.lh-form { display: flex; gap: 8px; padding: 10px; border-top: 1px solid #e5e7eb; background: #fff; }
.lh-form input {
  flex: 1; padding: 9px 12px; border: 1px solid #cbd5e1;
  border-radius: 8px; font-size: 14px; outline: none;
}
.lh-form input:focus { border-color: #2563eb; }
.lh-form button {
  padding: 9px 16px; border: none; border-radius: 8px;
  background: #2563eb; color: #fff; font-size: 14px; cursor: pointer;
}
.lh-form button:disabled { background: #cbd5e1; cursor: not-allowed; }

.lh-foot {
  padding: 7px 14px; font-size: 10px; color: #94a3b8;
  text-align: center; background: #fff; border-top: 1px solid #f1f5f9;
}

/* 모바일에서는 전체 화면 (RFP III-3-다) */
@media (max-width: 480px) {
  .lh-chat { right: 16px; bottom: 16px; }
  .lh-panel {
    position: fixed; inset: 0;
    width: 100%; height: 100%; max-height: none; border-radius: 0; border: none;
  }
}
</style>
