<!--
  챗봇 패널 — "그들의 룩, 나의 기능".
  FE v6 의 한지(hanji) 플로팅 챗봇 UI(🤖 도장 버튼 + 대화창)를 유지하되,
  실제 응답은 src/chatbot/ 코어(키워드 검색 → 컨텍스트 → OpenAI)가 처리한다.
  v6 원본 챗봇은 정적 껍데기(고정 메시지, 동작 안 함)였다.

  키가 없으면 코어가 오류 메시지를 버블로 돌려주므로 UI 는 그대로 동작한다.
-->
<script setup>
import { ref, reactive, nextTick } from 'vue'
import { createChatbot } from '../chatbot/index.js'

const bot = createChatbot()

const open = ref(false)
const input = ref('')
const busy = ref(false)
const bodyEl = ref(null)
const messages = reactive([...bot.messages])

const scrollToBottom = async () => {
  await nextTick()
  if (bodyEl.value) bodyEl.value.scrollTop = bodyEl.value.scrollHeight
}

const toggle = async () => {
  open.value = !open.value
  if (open.value) scrollToBottom()
}

const send = async () => {
  const query = input.value.trim()
  if (!query || busy.value) return
  input.value = ''
  busy.value = true
  messages.push({ id: `tmp_${Date.now()}`, role: 'user', content: query, sources: [] })
  scrollToBottom()

  await bot.send(query)

  // 코어가 사용자 메시지 + 응답을 모두 저장한다. 임시 목록을 정본으로 교체.
  messages.splice(0, messages.length, ...bot.messages)
  busy.value = false
  scrollToBottom()
}
</script>

<template>
  <div class="chatbot-floating">
    <div v-if="open" class="chat-window">
      <div class="chat-header">
        <span>🤖 AI 도우미</span>
        <button @click="toggle">✕</button>
      </div>
      <div ref="bodyEl" class="chat-body">
        <p v-if="messages.length === 0" class="bot-msg">
          서울의 관광지·문화시설·축제·숙소 정보를 안내해 드립니다. 무엇이 궁금하신가요?
        </p>

        <template v-for="m in messages" :key="m.id">
          <p v-if="m.role === 'assistant'" class="bot-msg">
            {{ m.content }}
            <span v-if="m.sources?.length" class="sources">
              <span v-for="s in m.sources" :key="s.id" class="source-chip">{{ s.name }}</span>
            </span>
          </p>
          <p v-else class="user-msg">{{ m.content }}</p>
        </template>

        <p v-if="busy" class="bot-msg typing">답변을 준비 중입니다…</p>
      </div>
      <div class="chat-input">
        <input
          v-model="input"
          type="text"
          placeholder="질문 입력..."
          :disabled="busy"
          @keyup.enter="send"
        />
        <button :disabled="busy || !input.trim()" @click="send">전송</button>
      </div>
    </div>
    <button v-else class="chat-btn" aria-label="챗봇 열기" @click="toggle">🤖</button>
  </div>
</template>

<style scoped>
.chatbot-floating {
  position: fixed;
  bottom: 25px;
  right: 25px;
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}
.chat-btn {
  width: 60px;
  height: 60px;
  border-radius: 0; /* 도장(낙관) 느낌의 사각형 */
  background-color: #2b5b53;
  border: 2px solid #1e1c1a;
  font-size: 1.8rem;
  cursor: pointer;
  box-shadow: 4px 4px 0 rgba(45, 42, 38, 0.15);
  transition: transform 0.1s;
}
.chat-btn:active {
  transform: translate(2px, 2px);
  box-shadow: 2px 2px 0 rgba(45, 42, 38, 0.15);
}
.chat-window {
  width: 340px;
  max-width: calc(100vw - 40px);
  background: #ffffff;
  border: 2px solid #2d2a26;
  overflow: hidden;
  margin-bottom: 15px;
  box-shadow: 6px 6px 0 rgba(45, 42, 38, 0.1);
  display: flex;
  flex-direction: column;
}
.chat-header {
  background: #1e1c1a;
  color: #f4f1ea;
  padding: 12px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
  border-bottom: 2px solid #2b5b53;
}
.chat-header button {
  background: none;
  border: none;
  color: #f4f1ea;
  cursor: pointer;
  font-size: 1.1rem;
}
.chat-body {
  padding: 16px;
  background: #f4f1ea;
  height: 320px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.bot-msg {
  align-self: flex-start;
  max-width: 85%;
  background: #ffffff;
  padding: 10px 14px;
  border: 1px solid #d1ccc2;
  border-left: 3px solid #2b5b53;
  font-size: 0.88rem;
  line-height: 1.6;
  margin: 0;
  color: #2d2a26;
  white-space: pre-wrap;
  word-break: break-word;
}
.user-msg {
  align-self: flex-end;
  max-width: 85%;
  background: #2b5b53;
  color: #f4f1ea;
  padding: 10px 14px;
  font-size: 0.88rem;
  line-height: 1.6;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}
.typing {
  color: #7a7469;
  font-style: italic;
}
.sources {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 8px;
}
.source-chip {
  font-size: 0.7rem;
  background: #e5e1d8;
  color: #5c564d;
  padding: 2px 7px;
}
.chat-input {
  display: flex;
  border-top: 1px solid #d1ccc2;
}
.chat-input input {
  flex: 1;
  padding: 12px 15px;
  border: none;
  outline: none;
  background: #ffffff;
  min-width: 0;
}
.chat-input button {
  background: #2b5b53;
  border: none;
  border-left: 1px solid #d1ccc2;
  color: #f4f1ea;
  font-weight: bold;
  padding: 0 20px;
  cursor: pointer;
}
.chat-input button:disabled {
  background: #9e988f;
  cursor: not-allowed;
}
</style>
