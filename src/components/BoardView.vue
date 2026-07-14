<!--
  익명 커뮤니티 게시판 — board_demo.html 에서 이식 (RFP III-2, Must have).

  이식 시 변경점:
  - Vue CDN / Tailwind CDN 제거 → 번들 Vue + 설치형 Tailwind
  - 데모용 3분할 스캐폴딩("타 팀원 작업 영역" placeholder) 제거 → 셸 위 오버레이로 동작
  - 필드명을 계약(snake_case)으로 교정: id→post_id, createdAt→created_at,
    updatedAt→updated_at, deletedAt→deleted_at (챗봇 posts.js 와의 통합 계약)
  - 비밀번호 확인을 PasswordModal.vue 로 분리 (수정·삭제 공유)

  비밀번호는 평문 저장·비교 — RFP III-2-나 의도된 설계(서버 없음).
-->
<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import PasswordModal from './PasswordModal.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
})
const emit = defineEmits(['update:open'])

const STORAGE_KEY = 'localhub:posts:v1'

const INITIAL_POSTS = [
  {
    post_id: 'db01c6c5-56fa-45b9-9a74-d4b68f9a2b5e',
    category: '공지',
    title: 'LocalHub에 오신 것을 환영합니다! 🎉',
    content:
      '본 애플리케이션은 별도 백엔드 서버 없이 브라우저 localStorage 만으로 구동되는 익명 게시판입니다.\n\n제목·내용과 함께 수정용 비밀번호를 설정하면, 그 비밀번호로만 수정·삭제할 수 있습니다.',
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
    category: '질문',
    title: '작성한 데이터는 브라우저를 닫아도 보존되나요?',
    content:
      '네. 브라우저 캐시나 로컬 데이터를 직접 지우지 않는 한, localStorage 는 브라우저를 재시작해도 데이터를 유지합니다.',
    password: 'user',
    created_at: '2026-07-14T14:15:00.000Z',
    updated_at: '2026-07-14T14:15:00.000Z',
    deleted_at: null,
    view_count: 15,
    like_count: 2,
    dislike_count: 0,
  },
]

// 상태
const posts = ref([])
const currentRoute = ref('list')
const currentPostId = ref(null)
const selectedCategory = ref('all')
const searchQuery = ref('')
const currentSort = ref('newest')

// 작성/수정 폼
const showPostModal = ref(false)
const isEditMode = ref(false)
const editingPostId = ref(null)
const categorySelect = ref('일반')
const customCategoryInput = ref('')
const postTitleInput = ref('')
const postContentInput = ref('')
const postPasswordInput = ref('')

// 비밀번호 확인 / 커스텀 confirm
const showPasswordConfirmModal = ref(false)
const pendingPasswordAction = ref(null)
const showCustomConfirmModal = ref(false)
const confirmTitle = ref('')
const confirmMessage = ref('')
const customConfirmCallback = ref(null)

const toasts = ref([])

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

const loadDatabase = () => {
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
    showToast('데이터베이스 복구 실패', 'error')
  }
}

const saveDatabase = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 1, posts: posts.value }))
  } catch {
    showToast('데이터 저장 중 오류가 발생했습니다.', 'error')
  }
}

watch(posts, saveDatabase, { deep: true })

// 소프트 삭제 필터는 여기 한 곳에만 둔다. 목록·상세·개수 전부 activePosts 를 거친다.
const activePosts = computed(() => posts.value.filter((p) => !p.deleted_at))

const categoryCounts = computed(() => {
  const counts = {}
  activePosts.value.forEach((p) => {
    counts[p.category] = (counts[p.category] || 0) + 1
  })
  return counts
})

const filteredPosts = computed(() => {
  const list = activePosts.value.filter((post) => {
    const matchCategory = selectedCategory.value === 'all' || post.category === selectedCategory.value
    const q = searchQuery.value.toLowerCase().trim()
    const matchSearch =
      !q || post.title.toLowerCase().includes(q) || post.content.toLowerCase().includes(q)
    return matchCategory && matchSearch
  })

  if (currentSort.value === 'newest') {
    list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  } else if (currentSort.value === 'views') {
    list.sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
  } else if (currentSort.value === 'likes') {
    list.sort((a, b) => (b.like_count || 0) - (a.like_count || 0))
  }
  return list
})

const currentPost = computed(
  () => posts.value.find((p) => p.post_id === currentPostId.value && !p.deleted_at) || null,
)

const navigateTo = (target, id = null) => {
  currentRoute.value = target
  currentPostId.value = id
  if (target === 'detail' && id) {
    const targetPost = posts.value.find((p) => p.post_id === id)
    if (targetPost) targetPost.view_count = (targetPost.view_count || 0) + 1
  }
}

const showToast = (message, type = 'success') => {
  const id = Date.now() + Math.random()
  toasts.value.push({ id, message, type })
  setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }, 2500)
}

const openPostCreateModal = () => {
  isEditMode.value = false
  editingPostId.value = null
  categorySelect.value = '일반'
  customCategoryInput.value = ''
  postTitleInput.value = ''
  postContentInput.value = ''
  postPasswordInput.value = ''
  showPostModal.value = true
}

const handleSavePost = () => {
  const category =
    categorySelect.value === 'custom' ? customCategoryInput.value.trim() : categorySelect.value
  const title = postTitleInput.value.trim()
  const content = postContentInput.value.trim()
  const password = postPasswordInput.value

  if (!category) return showToast('카테고리를 입력해 주십시오.', 'error')
  if (title.length < 1 || title.length > 100)
    return showToast('제목은 1자에서 최대 100자 이내여야 합니다.', 'error')
  if (content.length < 1 || content.length > 5000)
    return showToast('본문은 1자에서 최대 5000자 이내여야 합니다.', 'error')

  const now = new Date().toISOString()

  if (isEditMode.value) {
    const post = posts.value.find((p) => p.post_id === editingPostId.value)
    if (post) {
      post.category = category
      post.title = title
      post.content = content
      post.updated_at = now
      showToast('성공적으로 수정 완료되었습니다.', 'success')
      showPostModal.value = false
    }
  } else {
    if (password.length < 4) return showToast('비밀번호는 최소 4자 이상으로 설정하십시오.', 'error')
    posts.value.push({
      post_id: generateUUID(),
      category,
      title,
      content,
      password,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      view_count: 0,
      like_count: 0,
      dislike_count: 0,
    })
    showToast('새 글이 무사히 등록되었습니다.', 'success')
    showPostModal.value = false
  }
}

const handleReaction = (type) => {
  const post = posts.value.find((p) => p.post_id === currentPostId.value)
  if (!post) return
  if (type === 'like') {
    post.like_count = (post.like_count || 0) + 1
    showToast('게시글을 추천하였습니다.', 'success')
  } else if (type === 'dislike') {
    post.dislike_count = (post.dislike_count || 0) + 1
    showToast('의견에 비공감 표명하셨습니다.', 'success')
  }
}

// 수정·삭제는 비밀번호 확인 모달을 공유한다. 확인 후 실행할 동작을 pendingPasswordAction 에 담는다.
const triggerEditRequest = () => {
  const post = posts.value.find((p) => p.post_id === currentPostId.value)
  if (!post) return
  pendingPasswordAction.value = (password) => {
    if (post.password !== password) return showToast('비밀번호 검증에 실패했습니다.', 'error')
    showPasswordConfirmModal.value = false
    isEditMode.value = true
    editingPostId.value = post.post_id
    if (['일반', '질문', '정보', '자유'].includes(post.category)) {
      categorySelect.value = post.category
    } else {
      categorySelect.value = 'custom'
      customCategoryInput.value = post.category
    }
    postTitleInput.value = post.title
    postContentInput.value = post.content
    showPostModal.value = true
  }
  showPasswordConfirmModal.value = true
}

const triggerDeleteRequest = () => {
  const post = posts.value.find((p) => p.post_id === currentPostId.value)
  if (!post) return
  pendingPasswordAction.value = (password) => {
    if (post.password !== password) return showToast('비밀번호가 불일치합니다.', 'error')
    post.deleted_at = new Date().toISOString()
    showPasswordConfirmModal.value = false
    showToast('게시글이 성공적으로 삭제처리 되었습니다.', 'success')
    navigateTo('list')
  }
  showPasswordConfirmModal.value = true
}

const onPasswordSubmit = (password) => {
  if (typeof pendingPasswordAction.value === 'function') pendingPasswordAction.value(password)
}

const handleResetAllData = () => {
  showCustomConfirmModal.value = true
  confirmTitle.value = '스토리지 데이터 완전 초기화'
  confirmMessage.value =
    '초기화 시 브라우저 내부의 모든 게시글이 삭제되며, 기본 공지 세트로 복구됩니다. 계속하시겠습니까?'
  customConfirmCallback.value = (isConfirmed) => {
    showCustomConfirmModal.value = false
    if (isConfirmed) {
      localStorage.removeItem(STORAGE_KEY)
      loadDatabase()
      showToast('내부 스토리지가 복원되었습니다.', 'success')
      navigateTo('list')
    }
  }
}

const handleExportDatabase = () => {
  try {
    const backup = { schemaVersion: 1, posts: posts.value }
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2))
    const a = document.createElement('a')
    a.setAttribute('href', dataStr)
    a.setAttribute('download', `localhub_backup_${new Date().toISOString().slice(0, 10)}.json`)
    document.body.appendChild(a)
    a.click()
    a.remove()
    showToast('DB 백업본 추출 완료!', 'success')
  } catch {
    showToast('백업 진행 장애 발생', 'error')
  }
}

const formatDate = (isoStr) => {
  try {
    const date = new Date(isoStr)
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  } catch {
    return isoStr
  }
}

const close = () => emit('update:open', false)

onMounted(loadDatabase)
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-40"
    @click.self="close"
  >
    <div
      class="bg-slate-50 rounded-2xl w-full max-w-md h-[85vh] min-h-[500px] shadow-2xl border border-slate-200 flex flex-col overflow-hidden relative"
    >
      <!-- 헤더 -->
      <header class="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm shrink-0">
        <div class="px-4 h-14 flex items-center justify-between">
          <div
            class="flex items-center space-x-2.5 cursor-pointer select-none group"
            @click="navigateTo('list')"
            title="클릭 시 목록으로 돌아갑니다"
          >
            <div class="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-md shadow-indigo-200 transition group-hover:scale-105">
              <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <span class="text-sm font-bold tracking-tight text-slate-900 group-hover:text-indigo-600 transition">LocalHub 게시판</span>
              <span class="text-[9px] block text-indigo-500 font-semibold -mt-1">익명 커뮤니티</span>
            </div>
          </div>

          <div class="flex items-center space-x-2">
            <button
              @click="handleExportDatabase"
              class="p-1.5 text-slate-500 hover:text-slate-950 hover:bg-slate-100 rounded-lg transition"
              title="DB 백업 다운로드"
            >
              <svg class="w-4 h-4 stroke-current stroke-2 fill-none" viewBox="0 0 24 24">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
            </button>
            <button
              @click="openPostCreateModal"
              class="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-md shadow-indigo-100 transition flex items-center gap-1"
            >
              <svg class="w-3.5 h-3.5 stroke-current stroke-2" viewBox="0 0 24 24">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>새 글</span>
            </button>
            <button @click="close" class="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition" title="닫기">
              <svg class="w-5 h-5 stroke-current stroke-2" viewBox="0 0 24 24">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
      </header>

      <!-- 컨텐츠 -->
      <main class="flex-grow flex flex-col overflow-y-auto p-4 space-y-4">
        <!-- 목록: 검색 + 필터 -->
        <div v-show="currentRoute === 'list'" class="bg-white p-3 rounded-xl border border-slate-200/80 shadow-sm space-y-2.5 shrink-0">
          <div class="relative">
            <input
              type="text"
              v-model="searchQuery"
              placeholder="검색어를 입력하세요..."
              class="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
            <span class="absolute left-2.5 top-2.5 text-slate-400">
              <svg class="w-3 h-3 stroke-current stroke-2 fill-none" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </span>
          </div>

          <div class="flex flex-wrap gap-1.5 items-center justify-between">
            <div class="flex flex-wrap gap-1">
              <button
                @click="selectedCategory = 'all'"
                class="px-2 py-0.5 text-[10px] font-bold rounded transition"
                :class="selectedCategory === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
              >
                전체 ({{ activePosts.length }})
              </button>
              <button
                v-for="(count, catName) in categoryCounts"
                :key="catName"
                @click="selectedCategory = catName"
                class="px-2 py-0.5 text-[10px] font-bold rounded transition"
                :class="selectedCategory === catName ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'"
              >
                {{ catName }} ({{ count }})
              </button>
            </div>

            <select v-model="currentSort" class="text-[10px] bg-slate-50 border border-slate-200 rounded px-1.5 py-1 focus:outline-none">
              <option value="newest">최신순</option>
              <option value="views">조회순</option>
              <option value="likes">추천순</option>
            </select>
          </div>
        </div>

        <!-- 목록: 카드 -->
        <div v-show="currentRoute === 'list'" class="space-y-3 flex-grow flex flex-col">
          <div class="flex items-center justify-between px-1 text-[11px] text-slate-400">
            <span class="font-bold text-indigo-600">{{ selectedCategory === 'all' ? '전체 보기' : selectedCategory }}</span>
            <span>검색 결과 {{ filteredPosts.length }}건</span>
          </div>

          <div class="space-y-2">
            <div
              v-for="post in filteredPosts"
              :key="post.post_id"
              @click="navigateTo('detail', post.post_id)"
              class="bg-white p-3 rounded-xl border border-slate-200/85 hover:border-indigo-500 hover:shadow-sm transition cursor-pointer flex flex-col justify-between space-y-2"
            >
              <div>
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded-full">{{ post.category }}</span>
                  <span class="text-[9px] text-slate-400">{{ formatDate(post.created_at) }}</span>
                </div>
                <h3 class="text-xs font-bold text-slate-900 line-clamp-1 mb-1">{{ post.title }}</h3>
                <p class="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{{ post.content }}</p>
              </div>

              <div class="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] text-slate-400">
                <div class="flex items-center gap-2">
                  <span class="flex items-center gap-0.5">
                    <svg class="w-3.5 h-3.5 stroke-current stroke-[1.5] fill-none" viewBox="0 0 24 24">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    {{ post.view_count || 0 }}
                  </span>
                  <span class="text-emerald-600 flex items-center gap-0.5">
                    <svg class="w-3.5 h-3.5 stroke-current stroke-[1.5] fill-none" viewBox="0 0 24 24">
                      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                    </svg>
                    {{ post.like_count || 0 }}
                  </span>
                </div>
                <span class="text-[9px] text-slate-400 flex items-center gap-0.5">
                  자세히 보기
                  <svg class="w-3.5 h-3.5 stroke-current stroke-2" viewBox="0 0 24 24">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </span>
              </div>
            </div>
          </div>

          <div v-if="filteredPosts.length === 0" class="py-12 text-center bg-white rounded-xl border border-slate-200 border-dashed">
            <div class="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2 text-slate-400">
              <svg class="w-5 h-5 stroke-current stroke-[1.5] fill-none" viewBox="0 0 24 24">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <h4 class="text-xs font-semibold text-slate-700">등록된 게시글을 찾을 수 없습니다.</h4>
            <p class="text-[10px] text-slate-400 mt-1">'새 글' 버튼을 눌러 이야기를 채워보세요!</p>
          </div>
        </div>

        <!-- 상세 -->
        <div v-if="currentRoute === 'detail' && currentPost" class="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
          <div class="p-4 border-b border-slate-100 bg-slate-50/50">
            <div class="flex items-center gap-1.5 mb-1.5">
              <span class="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-600">{{ currentPost.category }}</span>
              <span class="text-[10px] text-slate-400">등록: {{ formatDate(currentPost.created_at) }}</span>
              <span
                v-if="currentPost.updated_at && currentPost.updated_at !== currentPost.created_at"
                class="text-[10px] bg-amber-50 text-amber-600 px-1 py-0.2 rounded"
                :title="`최종 수정: ${formatDate(currentPost.updated_at)}`"
                >수정됨</span
              >
            </div>
            <h1 class="text-base font-bold text-slate-900 tracking-tight leading-snug mb-3">{{ currentPost.title }}</h1>

            <div class="flex items-center justify-between gap-2 pt-2 border-t border-slate-100/70">
              <div class="flex items-center gap-2.5 text-[10px] text-slate-500">
                <span class="flex items-center gap-0.5">
                  <svg class="w-3.5 h-3.5 stroke-current stroke-[1.5] fill-none" viewBox="0 0 24 24">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                  {{ currentPost.view_count || 0 }}
                </span>
                <span class="text-emerald-600 flex items-center gap-0.5">
                  <svg class="w-3.5 h-3.5 stroke-current stroke-[1.5] fill-none" viewBox="0 0 24 24">
                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                  </svg>
                  {{ currentPost.like_count || 0 }}
                </span>
                <span class="text-rose-500 flex items-center gap-0.5">
                  <svg class="w-3.5 h-3.5 stroke-current stroke-[1.5] fill-none" viewBox="0 0 24 24">
                    <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm12-7h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"></path>
                  </svg>
                  {{ currentPost.dislike_count || 0 }}
                </span>
              </div>

              <div class="flex items-center gap-1.5">
                <button @click="triggerEditRequest" class="p-1 px-2 text-[10px] font-medium text-slate-600 hover:text-indigo-600 bg-white border border-slate-200 rounded transition flex items-center gap-1">
                  <svg class="w-3 h-3 stroke-current stroke-2 fill-none" viewBox="0 0 24 24">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                  수정
                </button>
                <button @click="triggerDeleteRequest" class="p-1 px-2 text-[10px] font-medium text-rose-600 hover:text-white hover:bg-rose-600 bg-white border border-rose-200 rounded transition flex items-center gap-1">
                  <svg class="w-3 h-3 stroke-current stroke-2 fill-none" viewBox="0 0 24 24">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                  삭제
                </button>
              </div>
            </div>
          </div>

          <div class="p-4">
            <div class="text-slate-700 leading-relaxed text-xs sm:text-sm whitespace-pre-wrap break-words min-h-[120px]">
              {{ currentPost.content }}
            </div>
          </div>

          <div class="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
            <button @click="navigateTo('list')" class="text-[10px] font-semibold text-slate-500 hover:text-slate-800 transition flex items-center gap-1">
              <svg class="w-3.5 h-3.5 stroke-current stroke-2" viewBox="0 0 24 24">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              목록으로 가기
            </button>

            <div class="flex items-center gap-1">
              <button @click="handleReaction('like')" class="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-semibold px-2.5 py-1 rounded transition flex items-center gap-0.5">
                <svg class="w-3 h-3 stroke-current stroke-[2] fill-none" viewBox="0 0 24 24">
                  <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                </svg>
                공감
              </button>
              <button @click="handleReaction('dislike')" class="bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-semibold px-2.5 py-1 rounded transition flex items-center gap-0.5">
                <svg class="w-3 h-3 stroke-current stroke-[2] fill-none" viewBox="0 0 24 24">
                  <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm12-7h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"></path>
                </svg>
                반대
              </button>
            </div>
          </div>
        </div>
      </main>

      <!-- 푸터 -->
      <footer class="p-3 bg-white border-t border-slate-200 shrink-0 flex items-center justify-between text-[10px] text-slate-400">
        <span>Key: localhub:posts:v1</span>
        <button @click="handleResetAllData" class="text-rose-500 hover:text-rose-700 underline font-medium">전체 데이터 초기화</button>
      </footer>

      <!-- 작성/수정 모달 -->
      <div v-if="showPostModal" class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div class="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85%]">
          <div class="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h2 class="text-xs font-bold text-slate-900">{{ isEditMode ? '게시글 편집하기' : '새로운 게시글 등록' }}</h2>
            <button @click="showPostModal = false" class="text-slate-400 hover:text-slate-600 transition">
              <svg class="w-5 h-5 stroke-current stroke-2" viewBox="0 0 24 24">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div class="p-4 space-y-3.5 overflow-y-auto flex-grow">
            <div>
              <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">카테고리</label>
              <div class="grid grid-cols-2 gap-1.5">
                <select v-model="categorySelect" class="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none">
                  <option value="일반">일반</option>
                  <option value="질문">질문</option>
                  <option value="정보">정보</option>
                  <option value="자유">자유</option>
                  <option value="custom">직접 입력...</option>
                </select>
                <input
                  v-if="categorySelect === 'custom'"
                  type="text"
                  v-model="customCategoryInput"
                  placeholder="카테고리명"
                  class="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <div class="flex justify-between items-center mb-1">
                <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">제목</label>
                <span class="text-[9px]" :class="postTitleInput.length > 100 ? 'text-rose-500' : 'text-slate-400'">{{ postTitleInput.length }} / 100자</span>
              </div>
              <input type="text" v-model="postTitleInput" placeholder="제목을 작성해주세요." maxlength="100" class="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none font-medium" />
            </div>

            <div>
              <div class="flex justify-between items-center mb-1">
                <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">내용</label>
                <span class="text-[9px]" :class="postContentInput.length > 5000 ? 'text-rose-500' : 'text-slate-400'">{{ postContentInput.length }} / 5000자</span>
              </div>
              <textarea v-model="postContentInput" placeholder="이야기를 적어보세요." rows="5" maxlength="5000" class="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none resize-none"></textarea>
            </div>

            <div v-if="!isEditMode">
              <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                비밀번호 설정 <span class="text-[9px] text-indigo-500">(4자 이상)</span>
              </label>
              <input type="password" v-model="postPasswordInput" placeholder="수정 및 삭제 시 사용됩니다." minlength="4" class="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none font-mono" />
            </div>
          </div>

          <div class="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-1.5">
            <button @click="showPostModal = false" class="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition">취소</button>
            <button @click="handleSavePost" class="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition">저장하기</button>
          </div>
        </div>
      </div>

      <!-- 비밀번호 확인 모달 (수정·삭제 공유) -->
      <PasswordModal :visible="showPasswordConfirmModal" @submit="onPasswordSubmit" @close="showPasswordConfirmModal = false" />

      <!-- 커스텀 confirm -->
      <div v-if="showCustomConfirmModal" class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div class="bg-white rounded-2xl w-full max-w-xs shadow-2xl border border-slate-100 overflow-hidden">
          <div class="p-4 text-center">
            <div class="w-10 h-10 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg class="w-5 h-5 stroke-current stroke-2 fill-none" viewBox="0 0 24 24">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </div>
            <h3 class="text-xs font-bold text-slate-800">{{ confirmTitle }}</h3>
            <p class="text-[10px] text-slate-400 mt-1.5">{{ confirmMessage }}</p>
          </div>
          <div class="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-center gap-1.5">
            <button @click="customConfirmCallback(false)" class="px-3 py-1.5 text-[10px] font-semibold text-slate-500 bg-white border border-slate-200 rounded-lg transition">취소</button>
            <button @click="customConfirmCallback(true)" class="px-3 py-1.5 text-[10px] font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition">실행</button>
          </div>
        </div>
      </div>

      <!-- 토스트 -->
      <div class="absolute bottom-4 right-4 space-y-1.5 z-[60] pointer-events-none">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="flex items-center gap-2 px-3 py-2 rounded-lg border shadow-md text-[10px] font-semibold pointer-events-auto"
          :class="toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'"
        >
          <span>{{ toast.message }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
