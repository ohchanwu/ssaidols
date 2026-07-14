<template>
  <div class="app-container">
    <header class="header">
      <div class="header-content">
        <h1>LocalHub <span class="badge">SEOUL</span></h1>
        <p>서울 권역 익명 정보 공유 커뮤니티</p>
      </div>
      <nav class="nav-tabs">
        <button
          v-for="cat in CATEGORIES"
          :key="cat.type"
          :class="{ active: currentType === cat.type }"
          @click="fetchData(cat.type)"
        >
          {{ cat.emoji }} {{ cat.label }}
        </button>
      </nav>
    </header>

    <main class="main-content">
      <div v-if="isLoading" class="status-msg">데이터를 불러오는 중입니다...</div>

      <div v-else-if="loadError" class="status-msg empty-state">
        ⚠️ 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
      </div>

      <div v-else-if="items.length > 0" class="card-grid">
        <div v-for="item in items" :key="item.id" class="card">
          <div class="card-image-wrapper">
            <img v-if="item.img" :src="item.img" alt="이미지" class="card-image" loading="lazy" />
            <div v-else class="no-image">이미지 준비중</div>
          </div>
          <div class="card-body">
            <span class="category-tag">{{ currentLabel }}</span>
            <h3 class="title">{{ item.name }}</h3>
            <p class="address">{{ item.addr }}</p>
          </div>
        </div>
      </div>

      <div v-else class="status-msg empty-state">
        ✨ 상단의 카테고리를 선택해 서울 정보를 확인하세요.
      </div>
    </main>

    <div class="floating-area">
      <button class="fab-btn write-btn" @click="boardOpen = true">
        <span class="icon">✍️</span>
        <span class="text">게시판</span>
      </button>

      <button class="fab-btn chat-btn" aria-label="챗봇 열기" @click="chatOpen = true">
        <span class="icon">💬</span>
      </button>
    </div>

    <!-- 게시판 오버레이 (셸의 '게시판' 버튼이 연다) -->
    <BoardView v-model:open="boardOpen" />

    <!-- 챗봇 (제어 모드 — 셸의 💬 버튼이 열림 상태를 쥔다. 자체 FAB 숨김) -->
    <ChatWidget :standalone="false" v-model:open="chatOpen" />

    <footer class="attribution">
      출처: 한국관광공사 TourAPI 4.0 · 공공누리 제3유형
    </footer>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import BoardView from './components/BoardView.vue';
import ChatWidget from './components/ChatWidget.vue';

// 슬림 인덱스 파일은 contentTypeId 로 이름 붙는다 (scripts/build-index.mjs).
const CATEGORIES = [
  { type: '12', label: '관광지', emoji: '👑' },
  { type: '14', label: '문화시설', emoji: '🎭' },
  { type: '15', label: '축제행사', emoji: '🎉' },
  { type: '25', label: '여행코스', emoji: '🗺️' },
  { type: '28', label: '레포츠', emoji: '🏄' },
  { type: '32', label: '숙박', emoji: '🏨' },
];

const items = ref([]);
const isLoading = ref(false);
const loadError = ref(false);
const currentType = ref('');

const boardOpen = ref(false);
const chatOpen = ref(false);

const currentLabel = computed(
  () => CATEGORIES.find((c) => c.type === currentType.value)?.label ?? '',
);

const fetchData = async (type) => {
  currentType.value = type;
  isLoading.value = true;
  loadError.value = false;
  items.value = [];

  try {
    const response = await fetch(`/index/${type}.json`);
    if (!response.ok) throw new Error(`인덱스 로드 실패: ${response.status}`);
    const data = await response.json();
    items.value = data.items;
  } catch (error) {
    console.error('[shell] POI 인덱스 로드 실패:', error);
    loadError.value = true;
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
/* 럭셔리 서울 테마 컬러 시스템 정의 */
/* Deep Purple: #2c1254 (황실의 보라) */
/* Gold: #D4AF37 (클래식 골드) */
/* Light Ivory: #FAF8F5 (은은한 크림빛 흰색) */

.app-container {
  max-width: 600px;
  margin: 0 auto;
  background-color: #FAF8F5; /* 따뜻하고 부드러운 느낌의 크리미 화이트 */
  min-height: 100vh;
  position: relative;
  font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  box-shadow: 0 0 30px rgba(44, 18, 84, 0.08); /* 보라빛이 살짝 가미된 고급스러운 그림자 */
}

/* 상단 헤더 (Deep Purple & Gold Line) */
.header {
  background-color: #2c1254; /* 짙은 보라색 */
  color: #ffffff;
  position: sticky;
  top: 0;
  z-index: 10;
  border-bottom: 2px solid #D4AF37; /* 황금빛 경계선 */
  box-shadow: 0 4px 15px rgba(44, 18, 84, 0.15);
}

.header-content {
  padding: 24px 20px 16px;
  text-align: center;
}

.header h1 {
  margin: 0 0 8px 0;
  font-size: 1.6rem;
  font-weight: 800;
  letter-spacing: -0.5px;
}

.badge {
  background-color: #D4AF37; /* 황금색 배지 */
  color: #2c1254; /* 글씨는 깊은 보라색 */
  font-size: 0.7rem;
  font-weight: 800;
  padding: 3px 10px;
  border-radius: 12px;
  vertical-align: middle;
  margin-left: 4px;
}

.header p {
  margin: 0;
  font-size: 0.85rem;
  opacity: 0.85;
  color: #E2D9F3; /* 은은한 연보라빛 연출 */
}

/* 카테고리 탭 */
.nav-tabs {
  display: flex;
  background-color: #1e0b3a; /* 더 어두운 보라색 */
  overflow-x: auto; /* 6개 탭 — 좁은 화면에서 가로 스크롤 */
}

.nav-tabs button {
  flex: 1 0 auto;
  padding: 14px 12px;
  white-space: nowrap;
  background: none;
  border: none;
  color: #A394B7; /* 차분한 그레이시 퍼플 */
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.nav-tabs button.active {
  color: #D4AF37; /* 황금색 활성화 */
  border-bottom: 3px solid #D4AF37;
  background-color: rgba(212, 175, 55, 0.05); /* 미세한 황금색 비침 효과 */
  font-weight: 700;
}

/* 메인 컨텐츠 영역 */
.main-content {
  padding: 20px;
  padding-bottom: 100px;
}

.card-grid {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.card {
  background: #ffffff; /* 순백색 카드 */
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(44, 18, 84, 0.04);
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(212, 175, 55, 0.15); /* 카드 테두리에 아주 연한 골드 프레임 적용 */
  transition: transform 0.2s, box-shadow 0.2s;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(44, 18, 84, 0.08);
}

.card-image-wrapper {
  height: 170px;
  background-color: #f1ecf7;
}

.card-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.no-image {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #a0aec0;
  font-size: 0.9rem;
  background-color: #f3effa;
}

.card-body {
  padding: 18px;
}

.category-tag {
  display: inline-block;
  font-size: 0.7rem;
  font-weight: 700;
  color: #c49a1f; /* 가독성을 위해 살짝 짙게 톤다운된 골드 */
  background-color: #FAF4E5; /* 아주 연한 아이보리 골드 배경 */
  padding: 4px 8px;
  border-radius: 4px;
  margin-bottom: 10px;
  border: 1px solid rgba(212, 175, 55, 0.3);
}

.title {
  margin: 0 0 8px 0;
  font-size: 1.15rem;
  color: #2c1254; /* 제목에 깊은 보라색 적용 */
  font-weight: 700;
}

.address {
  margin: 0;
  font-size: 0.85rem;
  color: #718096;
}

.status-msg {
  text-align: center;
  padding: 50px 0;
  color: #718096;
}

/* 하단 플로팅 영역 */
.floating-area {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 560px;
  display: flex;
  justify-content: space-between;
  padding: 0 20px;
  box-sizing: border-box;
  pointer-events: none;
  z-index: 50;
}

.fab-btn {
  pointer-events: auto;
  border: none;
  border-radius: 50px;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(44, 18, 84, 0.25); /* 그림자에도 깊은 보라 분위기 적용 */
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s, box-shadow 0.2s;
}

.fab-btn:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 28px rgba(44, 18, 84, 0.35);
}

/* 좌측: 새 글 작성 버튼 (White & Gold border) */
.write-btn {
  background-color: #ffffff;
  color: #2c1254;
  padding: 0 22px;
  height: 52px;
  font-weight: 700;
  border: 2.5px solid #D4AF37; /* 영롱한 황금빛 테두리 */
}

.write-btn .icon {
  margin-right: 8px;
  font-size: 1.1rem;
}

/* 우측: 챗봇 버튼 (Gold Fill & Deep Purple Icon) */
.chat-btn {
  background-color: #D4AF37;
  color: #2c1254;
  width: 60px;
  height: 60px;
  font-size: 1.6rem;
}

/* 출처 표기 (공공누리 3유형 의무) */
.attribution {
  text-align: center;
  padding: 16px 20px 24px;
  font-size: 0.7rem;
  color: #a99cbf;
  border-top: 1px solid #efeaf6;
}
</style>