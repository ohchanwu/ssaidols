<!--
  개발용 하네스 — 팀원의 프론트엔드가 나오기 전까지 챗봇을 단독으로 띄우고 테스트하기 위한 껍데기다.
  **납품 대상이 아니다.** 통합 시 이 디렉터리(src/dev/)는 통째로 버린다.

  게시글 검색을 실제로 확인할 수 있도록, 게시판이 아직 없을 때 샘플 게시글을 심는 버튼을 둔다.
-->
<script setup>
import { ref } from 'vue'
import ChatWidget from '../components/ChatWidget.vue'
import { POSTS_KEY } from '../chatbot/index.js'

const hasKey = Boolean(import.meta.env.VITE_OPENAI_API_KEY)
const seeded = ref(false)

const SAMPLE_POSTS = [
  {
    post_id: 'seed-1',
    category: '관광지',
    title: '경복궁 야간개장 다녀왔어요',
    content: '조명이 정말 예뻤습니다. 예약은 필수예요!',
    password: '1234',
    created_at: '2026-07-13T10:00:00.000Z',
    updated_at: '2026-07-13T10:00:00.000Z',
    deleted_at: null,
    view_count: 12,
    like_count: 3,
    dislike_count: 0,
  },
  {
    post_id: 'seed-2',
    category: '문화시설',
    title: '국립중앙박물관 주차 팁',
    content: '주말엔 지하주차장이 금방 차니 대중교통을 추천합니다.',
    password: '1234',
    created_at: '2026-07-13T11:00:00.000Z',
    updated_at: '2026-07-13T11:00:00.000Z',
    deleted_at: null,
    view_count: 8,
    like_count: 1,
    dislike_count: 0,
  },
]

function seedPosts() {
  localStorage.setItem(POSTS_KEY, JSON.stringify({ schemaVersion: 1, posts: SAMPLE_POSTS }))
  seeded.value = true
}
</script>

<template>
  <main>
    <h1>LocalHub 챗봇 — 개발 하네스</h1>
    <p class="muted">
      팀원의 프론트엔드가 나오기 전까지 챗봇을 단독으로 테스트하는 껍데기입니다.
      통합 시 <code>src/dev/</code> 는 버립니다.
    </p>

    <p v-if="!hasKey" class="warn">
      ⚠️ <code>VITE_OPENAI_API_KEY</code> 가 설정되지 않았습니다.
      <code>.env.example</code> 을 <code>.env</code> 로 복사하고 키를 채운 뒤 서버를 재시작하세요.
    </p>

    <p>
      <button type="button" @click="seedPosts">샘플 게시글 심기</button>
      <span v-if="seeded" class="ok"> ✓ 심었습니다 — 챗봇에 "경복궁 게시글 찾아줘" 라고 물어보세요.</span>
    </p>

    <p class="muted">우측 하단의 💬 버튼을 눌러 챗봇을 여세요.</p>

    <ChatWidget />
  </main>
</template>

<style>
body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; color: #0f172a; }
main { max-width: 640px; margin: 0 auto; padding: 48px 24px; }
h1 { font-size: 20px; }
.muted { color: #64748b; font-size: 14px; line-height: 1.7; }
.warn { background: #fef3c7; border: 1px solid #fcd34d; padding: 12px; border-radius: 8px; font-size: 14px; }
.ok { color: #059669; font-size: 14px; }
code { background: #f1f5f9; padding: 1px 5px; border-radius: 4px; font-size: 13px; }
button { padding: 8px 14px; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; cursor: pointer; }
button:hover { background: #f8fafc; }
</style>
