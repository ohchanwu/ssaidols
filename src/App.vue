<!--
  LocalHub 셸 — FE feature/frontend-work v6 (cfb56d2) 디자인을 정본으로 채택.
  한지(hanji) 테마·레이아웃·6탭 그리드는 FE 팀원 작업 그대로.

  통합 시 변경점:
  - fetchData: 원본 /data → 빌드 생성 슬림 인덱스 /index/{type}.json (슬림 스키마 바인딩)
  - 정적 게시판 placeholder → <BoardSection/> (localStorage CRUD, RFP III-2)
  - 정적 챗봇 placeholder → <ChatPanel/> (검색 + OpenAI 코어)
  - 출처 표기 추가 (공공누리 3유형 의무)
-->
<script setup>
import { ref, computed } from 'vue'
import BoardSection from './components/BoardSection.vue'
import ChatPanel from './components/ChatPanel.vue'

// 슬림 인덱스는 contentTypeId 로 파일명이 붙는다 (scripts/build-index.mjs).
const categories = [
  { name: '관광지', type: '12' },
  { name: '레포츠', type: '28' },
  { name: '문화시설', type: '14' },
  { name: '숙박', type: '32' },
  { name: '여행코스', type: '25' },
  { name: '축제/공연', type: '15' },
]

const items = ref([])
const isLoading = ref(false)
const loadError = ref(false)
const currentType = ref('')

const currentName = computed(() => categories.find((c) => c.type === currentType.value)?.name ?? '')

const fetchData = async (type) => {
  currentType.value = type
  isLoading.value = true
  loadError.value = false
  items.value = []

  try {
    const response = await fetch(`/index/${type}.json`)
    if (!response.ok) throw new Error(`인덱스 로드 실패: ${response.status}`)
    const data = await response.json()
    items.value = data.items
  } catch (error) {
    console.error('[shell] POI 인덱스 로드 실패:', error)
    loadError.value = true
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="app-wrapper">
    <header class="header">
      <div class="header-inner">
        <h1 class="logo">6백년의 역사, <span>서울</span></h1>
        <p class="subtitle">시민들이 직접 공유하는 서울의 진짜 명소</p>
      </div>
    </header>

    <main class="main-content">
      <!-- 6개 카테고리 탭 + 데이터 리스트 -->
      <section class="info-section">
        <div class="tab-grid">
          <button
            v-for="cat in categories"
            :key="cat.type"
            :class="{ active: currentType === cat.type }"
            @click="fetchData(cat.type)"
          >
            {{ cat.name }}
          </button>
        </div>

        <div class="list-container">
          <div v-if="isLoading" class="status-box"><p>데이터를 불러오는 중입니다...</p></div>

          <div v-else-if="loadError" class="status-box empty">
            <p>⚠️ 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
          </div>

          <div v-else-if="items.length > 0" class="list-wrapper">
            <div v-for="item in items" :key="item.id" class="list-item">
              <img v-if="item.img" :src="item.img" alt="명소 이미지" class="item-img" loading="lazy" />
              <div v-else class="item-img no-img">이미지 없음</div>

              <div class="item-info">
                <span class="item-category">{{ currentName }}</span>
                <h3 class="item-title">{{ item.name }}</h3>
                <p class="item-address">📍 {{ item.addr }}</p>
              </div>
            </div>
          </div>

          <div v-else class="status-box empty">
            <p>👆 카테고리를 선택해 정보를 확인해보세요.</p>
          </div>
        </div>
      </section>

      <!-- 하단: 실시간 게시판 (localStorage CRUD) -->
      <BoardSection />
    </main>

    <!-- 챗봇 (한지 UI + 검색·OpenAI 코어) -->
    <ChatPanel />

    <footer class="attribution">출처: 한국관광공사 TourAPI 4.0 · 공공누리 제3유형</footer>
  </div>
</template>

<style scoped>
.app-wrapper {
  background-color: #f4f1ea; /* 따뜻한 한지 톤 */
  min-height: 100vh;
  font-family: 'Pretendard', sans-serif;
  color: #2d2a26; /* 먹물 딥 차콜 */
  padding-bottom: 80px;
}

.header {
  background-color: #1e1c1a;
  padding: 24px 20px;
  text-align: center;
  border-bottom: 3px solid #2b5b53; /* 단청 청록 */
}
.header .logo {
  color: #f4f1ea;
  font-size: 1.8rem;
  font-weight: 700;
  margin: 0 0 5px 0;
  letter-spacing: 2px;
}
.header .logo span {
  color: #2b5b53;
}
.header .subtitle {
  color: #9e988f;
  font-size: 0.9rem;
  margin: 0;
  font-weight: 300;
}

.main-content {
  max-width: 800px;
  margin: 0 auto;
  padding: 30px 20px;
  display: flex;
  flex-direction: column;
  gap: 40px;
}
.tab-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr); /* 3x2 그리드 */
  gap: 8px;
  margin-bottom: 15px;
}
.tab-grid button {
  background: #ffffff;
  border: 1px solid #1e1c1a;
  padding: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.tab-grid button.active {
  background: #2b5b53;
  color: white;
}

.list-container {
  background: #ffffff;
  border: 1px solid #2d2a26;
  height: 450px;
  overflow-y: auto;
  box-shadow: 4px 4px 0 rgba(45, 42, 38, 0.1);
}
.list-item {
  display: flex;
  padding: 20px;
  border-bottom: 1px solid #e5e1d8;
  transition: background-color 0.2s;
}
.list-item:hover {
  background-color: #faf9f6;
}
.item-img {
  width: 90px;
  height: 90px;
  object-fit: cover;
  flex-shrink: 0;
  margin-right: 20px;
  border: 1px solid #e5e1d8;
}
.no-img {
  background-color: #e5e1d8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  color: #8c867a;
}
.item-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.item-category {
  font-size: 0.75rem;
  color: #2b5b53;
  font-weight: 700;
  margin-bottom: 6px;
  letter-spacing: 1px;
}
.item-title {
  font-size: 1.15rem;
  font-weight: 700;
  margin: 0 0 8px 0;
  color: #2d2a26;
}
.item-address {
  font-size: 0.85rem;
  color: #7a7469;
  margin: 0;
}
.status-box {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #7a7469;
  text-align: center;
  padding: 20px;
}

.attribution {
  text-align: center;
  padding: 20px;
  font-size: 0.72rem;
  color: #9e988f;
}
</style>
