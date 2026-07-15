<!--
  익명 커뮤니티 게시판 (RFP III-2, Must have).

  "그들의 룩, 나의 기능": FE v6 의 한지(hanji) 테마·인라인 섹션 디자인을 유지하되,
  기능은 localStorage 기반 CRUD + 평문 비밀번호 수정/삭제 + 소프트 삭제로 실제 동작한다.
  (v6 원본 게시판은 메모리 전용이라 RFP 필수요건을 충족하지 못했다.)

  스키마는 챗봇 posts.js 와의 통합 계약(snake_case): post_id/created_at/updated_at/deleted_at.
-->
<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import PasswordModal from './PasswordModal.vue'

const STORAGE_KEY = 'localhub:posts:v1'

const INITIAL_POSTS = [
  {
    post_id: 'db01c6c5-56fa-45b9-9a74-d4b68f9a2b5e',
    category: '공지',
    title: 'LocalHub에 오신 것을 환영합니다',
    content:
      '별도 서버 없이 브라우저 localStorage 만으로 동작하는 익명 게시판입니다.\n제목·내용과 함께 수정용 비밀번호를 설정하면, 그 비밀번호로만 수정·삭제할 수 있습니다.',
    password: 'admin',
    created_at: '2026-07-14T12:00:00.000Z',
    updated_at: '2026-07-14T12:00:00.000Z',
    deleted_at: null,
    view_count: 42,
    like_count: 8,
    dislike_count: 0,
  },
  {
    post_id: 'fc2a7042-9721-4f11-93e8-5b3ea79b3cb0',
    category: '자유',
    title: '어제 비오는 날 경복궁 다녀왔어요',
    content: '운치있고 사람도 없어서 사진 찍기 너무 좋았네요. 추천합니다.',
    password: 'user',
    created_at: '2026-07-14T14:15:00.000Z',
    updated_at: '2026-07-14T14:15:00.000Z',
    deleted_at: null,
    view_count: 15,
    like_count: 2,
    dislike_count: 0,
  },
]

const CATEGORIES = ['일반', '질문', '정보', '자유']

const posts = ref([])

// 모달 상태
const showEditor = ref(false)
const showDetail = ref(false)
const isEditMode = ref(false)
const editingId = ref(null)
const detailId = ref(null)

// 폼
const fCategory = ref('일반')
const fTitle = ref('')
const fContent = ref('')
const fPassword = ref('')

// 비밀번호 확인
const showPassword = ref(false)
const pendingAction = ref(null)

const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? `p_${Date.now()}_${Math.random().toString(36).slice(2)}`

const load = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 1, posts: INITIAL_POSTS }))
      posts.value = INITIAL_POSTS
      return
    }
    const db = JSON.parse(raw)
    posts.value = db && Array.isArray(db.posts) ? db.posts : []
  } catch {
    posts.value = []
  }
}
const save = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 1, posts: posts.value }))
  } catch {
    /* 할당량 초과 등 — 메모리 상태는 유지 */
  }
}
watch(posts, save, { deep: true })

// 소프트 삭제 필터는 여기 한 곳에만.
const activePosts = computed(() =>
  posts.value
    .filter((p) => !p.deleted_at)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
)

const detailPost = computed(
  () => posts.value.find((p) => p.post_id === detailId.value && !p.deleted_at) || null,
)

const formatDate = (iso) => {
  try {
    const d = new Date(iso)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  } catch {
    return iso
  }
}

const openCreate = () => {
  isEditMode.value = false
  editingId.value = null
  fCategory.value = '일반'
  fTitle.value = ''
  fContent.value = ''
  fPassword.value = ''
  showEditor.value = true
}

const openDetail = (post) => {
  const p = posts.value.find((x) => x.post_id === post.post_id)
  if (p) p.view_count = (p.view_count || 0) + 1
  detailId.value = post.post_id
  showDetail.value = true
}

const savePost = () => {
  const title = fTitle.value.trim()
  const content = fContent.value.trim()
  if (title.length < 1 || title.length > 100) return alert('제목은 1~100자여야 합니다.')
  if (content.length < 1 || content.length > 5000) return alert('내용은 1~5000자여야 합니다.')

  const now = new Date().toISOString()
  if (isEditMode.value) {
    const p = posts.value.find((x) => x.post_id === editingId.value)
    if (p) {
      p.category = fCategory.value
      p.title = title
      p.content = content
      p.updated_at = now
    }
    showEditor.value = false
  } else {
    if (fPassword.value.length < 4) return alert('비밀번호는 4자 이상이어야 합니다.')
    posts.value.push({
      post_id: uid(),
      category: fCategory.value,
      title,
      content,
      password: fPassword.value,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      view_count: 0,
      like_count: 0,
      dislike_count: 0,
    })
    showEditor.value = false
  }
}

// 수정·삭제는 비밀번호 확인 모달을 공유한다.
const requestEdit = () => {
  const post = detailPost.value
  if (!post) return
  pendingAction.value = (password) => {
    if (post.password !== password) return alert('비밀번호가 일치하지 않습니다.')
    showPassword.value = false
    showDetail.value = false
    isEditMode.value = true
    editingId.value = post.post_id
    fCategory.value = CATEGORIES.includes(post.category) ? post.category : '일반'
    fTitle.value = post.title
    fContent.value = post.content
    showEditor.value = true
  }
  showPassword.value = true
}

const requestDelete = () => {
  const post = detailPost.value
  if (!post) return
  pendingAction.value = (password) => {
    if (post.password !== password) return alert('비밀번호가 일치하지 않습니다.')
    post.deleted_at = new Date().toISOString()
    showPassword.value = false
    showDetail.value = false
  }
  showPassword.value = true
}

const onPasswordSubmit = (password) => {
  if (typeof pendingAction.value === 'function') pendingAction.value(password)
}

onMounted(load)
</script>

<template>
  <section class="board-section">
    <div class="section-header">
      <h2>💬 실시간 로컬 커뮤니티</h2>
      <button class="new-btn" @click="openCreate">✍️ 새 글</button>
    </div>

    <div class="board-container">
      <div v-if="activePosts.length === 0" class="board-empty">
        아직 게시글이 없습니다. 첫 글을 남겨보세요!
      </div>
      <div v-for="post in activePosts" :key="post.post_id" class="board-item" @click="openDetail(post)">
        <div class="board-content">
          <span class="board-cat">{{ post.category }}</span>
          <h4>{{ post.title }}</h4>
          <p>{{ post.content }}</p>
        </div>
        <span class="board-time">{{ formatDate(post.created_at) }}</span>
      </div>
    </div>

    <div class="quick-write">
      <button class="write-cta" @click="openCreate">서울에서의 경험을 남겨주세요! ✍️</button>
    </div>

    <!-- 작성/수정 모달 -->
    <div v-if="showEditor" class="modal-backdrop" @click.self="showEditor = false">
      <div class="modal">
        <div class="modal-head">
          <span>{{ isEditMode ? '게시글 수정' : '새 게시글 작성' }}</span>
          <button class="x" @click="showEditor = false">✕</button>
        </div>
        <div class="modal-body">
          <label>카테고리</label>
          <select v-model="fCategory" class="field">
            <option v-for="c in CATEGORIES" :key="c" :value="c">{{ c }}</option>
          </select>

          <label>제목 <span class="count">{{ fTitle.length }}/100</span></label>
          <input v-model="fTitle" type="text" maxlength="100" placeholder="제목" class="field" />

          <label>내용 <span class="count">{{ fContent.length }}/5000</span></label>
          <textarea v-model="fContent" rows="5" maxlength="5000" placeholder="내용" class="field"></textarea>

          <template v-if="!isEditMode">
            <label>비밀번호 <span class="count">(수정·삭제 시 사용, 4자 이상)</span></label>
            <input v-model="fPassword" type="password" placeholder="비밀번호" class="field mono" />
          </template>
        </div>
        <div class="modal-foot">
          <button class="btn ghost" @click="showEditor = false">취소</button>
          <button class="btn solid" @click="savePost">저장</button>
        </div>
      </div>
    </div>

    <!-- 상세 모달 -->
    <div v-if="showDetail && detailPost" class="modal-backdrop" @click.self="showDetail = false">
      <div class="modal">
        <div class="modal-head">
          <span>{{ detailPost.category }}</span>
          <button class="x" @click="showDetail = false">✕</button>
        </div>
        <div class="modal-body">
          <h3 class="detail-title">{{ detailPost.title }}</h3>
          <div class="detail-meta">
            등록 {{ formatDate(detailPost.created_at) }}
            <span v-if="detailPost.updated_at !== detailPost.created_at"> · 수정됨</span>
            · 조회 {{ detailPost.view_count || 0 }}
          </div>
          <p class="detail-content">{{ detailPost.content }}</p>
        </div>
        <div class="modal-foot">
          <button class="btn ghost" @click="showDetail = false">목록</button>
          <button class="btn edit" @click="requestEdit">수정</button>
          <button class="btn del" @click="requestDelete">삭제</button>
        </div>
      </div>
    </div>

    <PasswordModal :visible="showPassword" @submit="onPasswordSubmit" @close="showPassword = false" />
  </section>
</template>

<style scoped>
.board-section {
  background: #ffffff;
  border: 1px solid #2d2a26;
  padding: 25px;
  box-shadow: 4px 4px 0 rgba(45, 42, 38, 0.1);
}
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.section-header h2 {
  font-size: 1.3rem;
  color: #1e1c1a;
  margin: 0;
  border-left: 4px solid #2b5b53;
  padding-left: 10px;
}
.new-btn {
  background: #1e1c1a;
  color: #f4f1ea;
  border: none;
  padding: 8px 16px;
  font-weight: 700;
  cursor: pointer;
}
.new-btn:hover {
  background: #2b5b53;
}
.board-container {
  max-height: 320px;
  overflow-y: auto;
  border-top: 1px solid #2d2a26;
  margin-bottom: 20px;
}
.board-empty {
  padding: 40px 0;
  text-align: center;
  color: #8c867a;
  font-size: 0.9rem;
}
.board-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px 4px;
  border-bottom: 1px dashed #d1ccc2;
  cursor: pointer;
  transition: background-color 0.15s;
}
.board-item:hover {
  background-color: #faf9f6;
}
.board-cat {
  font-size: 0.7rem;
  color: #2b5b53;
  font-weight: 700;
  letter-spacing: 0.05em;
}
.board-content h4 {
  margin: 4px 0 6px;
  font-size: 1.05rem;
  color: #2d2a26;
}
.board-content p {
  margin: 0;
  font-size: 0.9rem;
  color: #5c564d;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  -webkit-box-orient: vertical;
}
.board-time {
  font-size: 0.75rem;
  color: #8c867a;
  white-space: nowrap;
  margin-left: 15px;
}
.quick-write .write-cta {
  width: 100%;
  padding: 12px 15px;
  border: 1px solid #c4beb1;
  background: #faf9f6;
  color: #7a7469;
  text-align: left;
  cursor: pointer;
  font-size: 0.9rem;
}
.quick-write .write-cta:hover {
  border-color: #2b5b53;
  color: #2d2a26;
}

/* 모달 (한지 테마) */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(30, 28, 26, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 150;
}
.modal {
  width: 100%;
  max-width: 440px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  background: #fffdf9;
  border: 2px solid #2d2a26;
  box-shadow: 6px 6px 0 rgba(45, 42, 38, 0.12);
}
.modal-head {
  background: #1e1c1a;
  color: #f4f1ea;
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 700;
  border-bottom: 2px solid #2b5b53;
}
.modal-head .x {
  background: none;
  border: none;
  color: #f4f1ea;
  cursor: pointer;
  font-size: 1rem;
}
.modal-body {
  padding: 18px 16px;
  overflow-y: auto;
}
.modal-body label {
  display: block;
  font-size: 0.75rem;
  font-weight: 700;
  color: #5c564d;
  margin: 12px 0 5px;
  letter-spacing: 0.03em;
}
.modal-body label:first-child {
  margin-top: 0;
}
.count {
  font-weight: 400;
  color: #8c867a;
}
.field {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border: 1px solid #c4beb1;
  background: #faf9f6;
  outline: none;
  font-size: 0.9rem;
  color: #2d2a26;
}
.field:focus {
  border-color: #2b5b53;
}
textarea.field {
  resize: none;
}
.field.mono {
  font-family: monospace;
}
.detail-title {
  margin: 0 0 8px;
  font-size: 1.25rem;
  color: #1e1c1a;
}
.detail-meta {
  font-size: 0.75rem;
  color: #8c867a;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e1d8;
  margin-bottom: 14px;
}
.detail-content {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.7;
  color: #2d2a26;
  white-space: pre-wrap;
  word-break: break-word;
}
.modal-foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid #e5e1d8;
}
.btn {
  padding: 8px 16px;
  border: none;
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
}
.btn.ghost {
  background: #fff;
  border: 1px solid #c4beb1;
  color: #5c564d;
}
.btn.solid {
  background: #2b5b53;
  color: #f4f1ea;
}
.btn.solid:hover {
  background: #1e1c1a;
}
.btn.edit {
  background: #fff;
  border: 1px solid #2b5b53;
  color: #2b5b53;
}
.btn.del {
  background: #fff;
  border: 1px solid #a4443a;
  color: #a4443a;
}
.btn.del:hover {
  background: #a4443a;
  color: #fff;
}
</style>
