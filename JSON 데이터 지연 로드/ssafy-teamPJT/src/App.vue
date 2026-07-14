<template>
  <div class="app-wrapper">
    <!-- 상단 네비게이션 바 (Glassmorphism) -->
    <nav class="navbar">
      <div class="nav-brand">
        <span class="brand-title">LocalHub</span>
        <span class="brand-badge">SEOUL</span>
      </div>
      <div class="nav-links">
        <button class="nav-item" @click="fetchData('서울_관광지')" :class="{ active: currentTab === '서울_관광지' }">관광지 탐색</button>
        <button class="nav-item" @click="fetchData('서울_문화시설')" :class="{ active: currentTab === '서울_문화시설' }">문화시설 탐색</button>
      </div>
      <div class="nav-actions">
        <!-- 상단으로 이동한 글쓰기 버튼 -->
        <button class="btn-outline-gold" @click="togglePostModal">
          <span class="icon">✍️</span> Share Experience
        </button>
      </div>
    </nav>

    <!-- 와이드 히어로 섹션 (다크/모던 감성 + 그리드 라인) -->
    <header class="hero-section">
      <div class="hero-bg"></div>
      <div class="grid-lines"></div>
      <div class="hero-content">
        <h1 class="hero-title">Experience<br>The <span>Elegance</span> of Seoul.</h1>
        <p class="hero-subtitle">전통과 하이엔드 모던이 공존하는 서울의 럭셔리 스팟을 만나보세요.</p>
        
        <div class="action-buttons">
          <button class="btn-solid-gold" @click="fetchData('서울_관광지')">Explore Places</button>
        </div>
      </div>
    </header>

    <!-- 메인 콘텐츠 영역 (크리미 화이트 배경) -->
    <main class="main-content" id="explore-section">
      <div class="section-header" v-if="currentTab">
        <h2>{{ currentTab === '서울_관광지' ? 'Premium Destinations' : 'Cultural Highlights' }}</h2>
        <div class="header-line"></div>
      </div>

      <!-- 로딩 상태 -->
      <div v-if="isLoading" class="loading-state">
        <div class="spinner"></div>
        <p>서울의 아름다움을 불러오는 중입니다...</p>
      </div>
      
      <!-- 데이터 그리드 -->
      <div v-else-if="items.length > 0" class="card-grid">
        <div v-for="item in items" :key="item.contentid" class="modern-card">
          <div class="card-img-box">
            <img v-if="item.firstimage" :src="item.firstimage" alt="명소 이미지" />
            <div v-else class="no-img">Image Not Available</div>
            <div class="card-tag">{{ currentTab === '서울_관광지' ? 'TOUR' : 'CULTURE' }}</div>
          </div>
          <div class="card-info">
            <h3 class="card-title">{{ item.title }}</h3>
            <p class="card-address">📍 {{ item.addr1 }}</p>
          </div>
        </div>
      </div>

      <!-- 초기 화면 (데이터 없음) -->
      <div v-else class="empty-state">
        <p>상단의 탭을 선택하여 데이터를 불러오세요.</p>
      </div>
    </main>

    <!-- 1. 게시글 작성 모달창 (새 페이지 이동 없이 팝업) -->
    <transition name="fade">
      <div class="modal-overlay" v-if="isPostModalOpen" @click.self="togglePostModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Share Your Seoul</h3>
            <button class="close-btn" @click="togglePostModal">✕</button>
          </div>
          <div class="modal-body">
            <div class="input-group">
              <label>제목</label>
              <input type="text" placeholder="어떤 특별한 경험을 하셨나요?" class="input-field" />
            </div>
            <div class="input-group">
              <label>내용</label>
              <textarea placeholder="자유롭게 이야기를 나누어주세요." class="textarea-field"></textarea>
            </div>
            <div class="input-group">
              <label>비밀번호 (수정/삭제용)</label>
              <input type="password" placeholder="비밀번호 입력" class="input-field" />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-text" @click="togglePostModal">Cancel</button>
            <button class="btn-solid-gold" @click="submitPost">Post Review</button>
          </div>
        </div>
      </div>
    </transition>

    <!-- 2. 챗봇 위젯 (우측 하단 고정, 클릭 시 열림) -->
    <div class="chatbot-wrapper" :class="{ 'is-open': isChatOpen }">
      <!-- 챗봇 열기 버튼 -->
      <transition name="scale">
        <button class="chat-toggle-btn" @click="toggleChat" v-if="!isChatOpen">
          <span class="icon">💬</span>
        </button>
      </transition>
      
      <!-- 챗봇 창 -->
      <transition name="slide-up">
        <div class="chat-window" v-if="isChatOpen">
          <div class="chat-header">
            <div class="chat-header-info">
              <span class="status-dot"></span>
              <span class="chat-title">LocalHub AI Guide</span>
            </div>
            <button class="close-chat" @click="toggleChat">✕</button>
          </div>
          <div class="chat-body">
            <div class="chat-message bot">
              환영합니다! 서울의 럭셔리한 여행 코스나 맛집에 대해 무엇이든 물어보세요. ✨
            </div>
          </div>
          <div class="chat-input-area">
            <input type="text" placeholder="메시지를 입력하세요..." />
            <button class="send-btn">➤</button>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const items = ref([]);
const isLoading = ref(false);
const currentTab = ref('');

// 모달 및 챗봇 상태 관리
const isPostModalOpen = ref(false);
const isChatOpen = ref(false);

const fetchData = async (fileName) => {
  currentTab.value = fileName;
  isLoading.value = true;
  items.value = []; 

  try {
    const response = await fetch(`/data/${fileName}.json`);
    if (!response.ok) throw new Error("파일 확인 필요");
    const data = await response.json();
    items.value = data.items; 
    
    // 데이터 로드 후 스크롤 부드럽게 이동
    document.getElementById('explore-section').scrollIntoView({ behavior: 'smooth' });
  } catch (error) {
    console.warn("데이터를 불러오지 못했습니다. 경로를 확인해주세요.");
  } finally {
    isLoading.value = false;
  }
};

// UI 기능 컨트롤 함수
const togglePostModal = () => {
  isPostModalOpen.value = !isPostModalOpen.value;
};

const submitPost = () => {
  alert("게시글이 저장되었습니다! (추후 로컬스토리지 연동)");
  togglePostModal();
};

const toggleChat = () => {
  isChatOpen.value = !isChatOpen.value;
};
</script>

<style scoped>
/* 컬러 팔레트 (다크 모던 + 퍼플/골드/화이트) */
:root {
  --color-deep-purple: #120822; /* 아주 어두운 보라색 (거의 검정) */
  --color-primary-purple: #2c1254; 
  --color-gold: #D4AF37; 
  --color-gold-hover: #b5952f;
  --color-cream: #FAF8F5;
  --color-white: #ffffff;
  --color-text-dark: #1a1a1a;
  --color-text-gray: #718096;
}

/* 전체 래퍼 */
.app-wrapper {
  background-color: var(--color-cream);
  min-height: 100vh;
  font-family: 'Pretendard', -apple-system, sans-serif;
  color: var(--color-text-dark);
  overflow-x: hidden;
}

/* 네비게이션 바 */
.navbar {
  position: fixed;
  top: 0;
  width: 100%;
  height: 80px;
  background: rgba(18, 8, 34, 0.85); /* 딥 퍼플 반투명 */
  backdrop-filter: blur(12px);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 5%;
  z-index: 100;
  border-bottom: 1px solid rgba(212, 175, 55, 0.2);
  box-sizing: border-box;
}
.nav-brand {
  color: var(--color-gold);
  font-size: 1.6rem;
  font-weight: 800;
  letter-spacing: -0.5px;
}
.brand-badge {
  font-size: 0.65rem;
  background: transparent;
  color: var(--color-white);
  border: 1px solid var(--color-gold);
  padding: 2px 8px;
  border-radius: 20px;
  margin-left: 6px;
  vertical-align: middle;
}
.nav-links {
  display: flex;
  gap: 40px;
}
.nav-item {
  background: none;
  border: none;
  color: #a0aec0;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: 0.3s;
  text-transform: uppercase;
  letter-spacing: 1px;
}
.nav-item:hover, .nav-item.active {
  color: var(--color-gold);
}

/* 버튼 스타일 */
.btn-outline-gold {
  background: transparent;
  color: var(--color-gold);
  border: 1px solid var(--color-gold);
  padding: 10px 24px;
  border-radius: 30px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}
.btn-outline-gold:hover {
  background: rgba(212, 175, 55, 0.1);
}
.btn-solid-gold {
  background: var(--color-gold);
  color: var(--color-deep-purple);
  border: none;
  padding: 14px 32px;
  border-radius: 30px;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s;
  text-transform: uppercase;
  letter-spacing: 1px;
}
.btn-solid-gold:hover {
  background: var(--color-gold-hover);
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(212, 175, 55, 0.3);
}

/* 히어로 섹션 (레퍼런스 반영: 다크 + 얇은 선) */
.hero-section {
  position: relative;
  height: 80vh;
  min-height: 600px;
  background-color: var(--color-deep-purple);
  display: flex;
  align-items: center;
  padding: 0 5%;
  overflow: hidden;
}
.hero-bg {
  position: absolute;
  inset: 0;
  background-image: url('https://images.unsplash.com/photo-1616428383212-32b0058ec1eb?auto=format&fit=crop&w=1920&q=80');
  background-size: cover;
  background-position: center;
  opacity: 0.25;
}
.grid-lines {
  position: absolute;
  inset: 0;
  background-image: 
    linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
  background-size: 100px 100px;
  opacity: 0.5;
}
.hero-content {
  position: relative;
  z-index: 10;
  max-width: 800px;
  color: var(--color-white);
}
.hero-title {
  font-size: 4.5rem;
  font-weight: 800;
  line-height: 1.1;
  margin-bottom: 20px;
  letter-spacing: -2px;
}
.hero-title span {
  color: var(--color-gold);
  font-style: italic;
}
.hero-subtitle {
  font-size: 1.2rem;
  color: #cbd5e0;
  margin-bottom: 40px;
  font-weight: 300;
  line-height: 1.6;
}

/* 메인 컨텐츠 영역 */
.main-content {
  padding: 100px 5%;
  min-height: 60vh;
}
.section-header {
  margin-bottom: 50px;
}
.section-header h2 {
  font-size: 2.5rem;
  color: var(--color-primary-purple);
  margin: 0;
  font-weight: 800;
}
.header-line {
  width: 60px;
  height: 4px;
  background-color: var(--color-gold);
  margin-top: 20px;
}

/* 와이드 그리드 레이아웃 */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 40px;
}

/* 프리미엄 카드 디자인 */
.modern-card {
  background: var(--color-white);
  border-radius: 0; 
  overflow: hidden;
  border: 1px solid #e2e8f0;
  transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
  box-shadow: 0 4px 6px rgba(0,0,0,0.02);
}
.modern-card:hover {
  transform: translateY(-10px);
  box-shadow: 0 20px 40px rgba(44, 18, 84, 0.1);
  border-color: var(--color-gold);
}
.card-img-box {
  position: relative;
  height: 250px;
  background: #f1f1f1;
  overflow: hidden;
}
.card-img-box img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}
.modern-card:hover .card-img-box img {
  transform: scale(1.05);
}
.no-img {
  display: flex;
  height: 100%;
  align-items: center;
  justify-content: center;
  color: #a0aec0;
}
.card-tag {
  position: absolute;
  top: 20px;
  left: 20px;
  background: var(--color-deep-purple);
  color: var(--color-gold);
  padding: 6px 12px;
  font-size: 0.75rem;
  font-weight: bold;
  letter-spacing: 1px;
}
.card-info {
  padding: 25px;
}
.card-title {
  font-size: 1.3rem;
  color: var(--color-primary-purple);
  margin-bottom: 12px;
  font-weight: 700;
}
.card-address {
  font-size: 0.95rem;
  color: var(--color-text-gray);
}

/* 1. 글쓰기 모달창 (화면 정중앙 팝업) */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(18, 8, 34, 0.8);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-content {
  background: var(--color-white);
  width: 90%;
  max-width: 550px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 25px 50px rgba(0,0,0,0.3);
}
.modal-header {
  background: var(--color-primary-purple);
  color: var(--color-white);
  padding: 25px 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.modal-header h3 { 
  margin: 0; 
  color: var(--color-gold);
  font-weight: 700;
}
.close-btn {
  background: none;
  border: none;
  color: var(--color-white);
  font-size: 1.5rem;
  cursor: pointer;
}
.modal-body {
  padding: 30px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.input-group label {
  display: block;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-primary-purple);
  margin-bottom: 8px;
}
.input-field, .textarea-field {
  width: 100%;
  padding: 14px;
  border: 1px solid #cbd5e0;
  border-radius: 6px;
  font-family: inherit;
  font-size: 1rem;
  box-sizing: border-box;
}
.input-field:focus, .textarea-field:focus {
  outline: none;
  border-color: var(--color-gold);
  box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.2);
}
.textarea-field {
  height: 150px;
  resize: none;
}
.modal-footer {
  padding: 20px 30px 30px;
  display: flex;
  justify-content: flex-end;
  gap: 15px;
}
.btn-text {
  background: none;
  border: none;
  color: var(--color-text-gray);
  font-weight: 600;
  cursor: pointer;
  padding: 0 15px;
}

/* 2. 챗봇 위젯 (화면 우측 하단 팝업) */
.chatbot-wrapper {
  position: fixed;
  bottom: 40px;
  right: 40px;
  z-index: 999;
}
.chat-toggle-btn {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  background-color: var(--color-primary-purple);
  border: 2px solid var(--color-gold);
  color: var(--color-gold);
  font-size: 2rem;
  cursor: pointer;
  box-shadow: 0 10px 25px rgba(44, 18, 84, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}
.chat-window {
  width: 360px;
  height: 550px;
  background: var(--color-white);
  border-radius: 16px;
  box-shadow: 0 15px 40px rgba(0,0,0,0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #e2e8f0;
}
.chat-header {
  background: var(--color-primary-purple);
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.chat-header-info {
  display: flex;
  align-items: center;
  gap: 10px;
}
.status-dot {
  width: 10px;
  height: 10px;
  background-color: #48bb78;
  border-radius: 50%;
}
.chat-title {
  color: var(--color-gold);
  font-weight: 700;
}
.close-chat {
  background: none;
  border: none;
  color: var(--color-white);
  font-size: 1.2rem;
  cursor: pointer;
}
.chat-body {
  flex: 1;
  padding: 20px;
  background: #f8fafc;
  overflow-y: auto;
}
.chat-message.bot {
  background: var(--color-white);
  color: var(--color-text-dark);
  padding: 14px 18px;
  border-radius: 0 16px 16px 16px;
  display: inline-block;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  font-size: 0.95rem;
  line-height: 1.5;
  border: 1px solid #e2e8f0;
}
.chat-input-area {
  padding: 15px;
  background: var(--color-white);
  border-top: 1px solid #e2e8f0;
  display: flex;
  gap: 10px;
}
.chat-input-area input {
  flex: 1;
  padding: 12px 15px;
  border: 1px solid #e2e8f0;
  border-radius: 30px;
  outline: none;
  background: #f8fafc;
}
.chat-input-area input:focus {
  border-color: var(--color-gold);
}
.send-btn {
  background: var(--color-primary-purple);
  color: var(--color-gold);
  border: none;
  width: 45px;
  height: 45px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 로딩/빈 상태 */
.loading-state, .empty-state {
  text-align: center;
  padding: 100px 0;
  color: var(--color-text-gray);
  font-size: 1.1rem;
}
.spinner {
  width: 50px;
  height: 50px;
  border: 3px solid rgba(212, 175, 55, 0.2);
  border-top-color: var(--color-gold);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

/* Vue 트랜지션 애니메이션 */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.scale-enter-active, .scale-leave-active { transition: all 0.3s ease; }
.scale-enter-from, .scale-leave-to { opacity: 0; transform: scale(0.8); }
.slide-up-enter-active, .slide-up-leave-active { transition: all 0.3s cubic-bezier(0.165, 0.84, 0.44, 1); }
.slide-up-enter-from, .slide-up-leave-to { opacity: 0; transform: translateY(30px); }

@keyframes spin { 100% { transform: rotate(360deg); } }
</style>