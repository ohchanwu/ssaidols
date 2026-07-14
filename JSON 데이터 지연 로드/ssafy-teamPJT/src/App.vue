<template>
  <div class="app-wrapper">
    <!-- 상단 네비게이션 -->
    <header class="header">
      <div class="header-inner">
        <h1 class="logo">LocalHub <span>서울</span></h1>
        <p class="subtitle">시민들이 직접 공유하는 서울의 진짜 명소</p>
      </div>
    </header>

    <main class="main-content">
      <!-- 상단 영역: 정보 탐색 (리스트 뷰 & 자체 스크롤) -->
      <section class="info-section">
        <div class="tab-buttons">
          <button 
            :class="{ active: currentTab === '서울_관광지' }" 
            @click="fetchData('서울_관광지')"
          >
            📍 관광지 모아보기
          </button>
          <button 
            :class="{ active: currentTab === '서울_문화시설' }" 
            @click="fetchData('서울_문화시설')"
          >
            🎨 문화시설 모아보기
          </button>
        </div>

        <!-- 데이터 리스트 컨테이너 (스크롤 고정 영역) -->
        <div class="list-container">
          <div v-if="isLoading" class="status-box">
            <p>데이터를 불러오는 중입니다...</p>
          </div>
          
          <div v-else-if="items.length > 0" class="list-wrapper">
            <div v-for="item in items" :key="item.contentid" class="list-item">
              <img v-if="item.firstimage" :src="item.firstimage" alt="명소 이미지" class="item-img" />
              <div v-else class="item-img no-img">이미지 없음</div>
              
              <div class="item-info">
                <span class="item-category">{{ currentTab === '서울_관광지' ? '관광지' : '문화시설' }}</span>
                <h3 class="item-title">{{ item.title }}</h3>
                <p class="item-address">{{ item.addr1 }}</p>
              </div>
            </div>
          </div>

          <div v-else class="status-box empty">
            <p>👆 위 버튼을 눌러 서울의 명소를 확인해보세요.</p>
          </div>
        </div>
      </section>

      <!-- 하단 영역: 실시간 게시판 -->
      <section class="board-section">
        <div class="section-header">
          <h2>💬 실시간 로컬 커뮤니티</h2>
        </div>
        
        <!-- 게시글 리스트 (스크롤 고정) -->
        <div class="board-container">
          <div v-for="post in posts" :key="post.id" class="board-item">
            <div class="board-content">
              <h4>{{ post.title }}</h4>
              <p>{{ post.content }}</p>
            </div>
            <span class="board-time">{{ post.time }}</span>
          </div>
        </div>

        <!-- 빠른 글쓰기 영역 -->
        <div class="quick-write">
          <input type="text" v-model="newPost" placeholder="서울에서의 경험을 짧게 남겨주세요!" @keyup.enter="addPost" />
          <button @click="addPost">등록</button>
        </div>
      </section>
    </main>

    <!-- 우측 하단 챗봇 둥둥이 -->
    <div class="chatbot-floating">
      <div v-if="isChatOpen" class="chat-window">
        <div class="chat-header">
          <span>AI 도우미</span>
          <button @click="isChatOpen = false">✕</button>
        </div>
        <div class="chat-body">
          <p class="bot-msg">안녕하세요! 서울 관광이나 교통편에 대해 무엇이든 물어보세요.</p>
        </div>
        <div class="chat-input">
          <input type="text" placeholder="질문 입력..." />
          <button>전송</button>
        </div>
      </div>
      <button class="chat-btn" v-else @click="isChatOpen = true">🤖</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const items = ref([]);
const isLoading = ref(false);
const currentTab = ref('');

// 가짜 게시판 데이터
const posts = ref([
  { id: 1, title: '어제 비오는 날 경복궁 다녀왔어요', content: '운치있고 사람도 없어서 사진 찍기 너무 좋았네요. 추천합니다.', time: '10분 전' },
  { id: 2, title: '성수동 주차 꿀팁 공유', content: '공영주차장 자리 없으면 근처 마트 주차장 이용하고 영수증 챙기세요!', time: '1시간 전' },
  { id: 3, title: '광장시장 육회 맛집 어딘가요?', content: '내일 갈 예정인데 현지인 찐맛집 추천 부탁드려요.', time: '2시간 전' }
]);
const newPost = ref('');

// 챗봇 상태
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
  } catch (error) {
    console.warn("데이터 로드 실패. 경로를 확인하세요.");
  } finally {
    isLoading.value = false;
  }
};

const addPost = () => {
  if (!newPost.value.trim()) return;
  posts.value.unshift({
    id: Date.now(),
    title: '새로운 로컬 제보',
    content: newPost.value,
    time: '방금 전'
  });
  newPost.value = '';
};
</script>

<style scoped>
/* 폰트 및 전체 배경 (눈이 편안한 밝은 톤) */
.app-wrapper {
  background-color: #F8F9FA;
  min-height: 100vh;
  font-family: 'Pretendard', sans-serif;
  color: #212529;
  padding-bottom: 80px;
}

/* 상단 헤더 (딥 퍼플 배경에 흰색/골드 텍스트로 가독성 확보) */
.header {
  background-color: #2b1b46; /* 깊은 보라색 */
  padding: 20px;
  text-align: center;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}
.header .logo {
  color: #ffffff;
  font-size: 1.8rem;
  font-weight: 800;
  margin: 0 0 5px 0;
}
.header .logo span {
  color: #F5A623; /* 명시성 높은 옐로우 골드 */
}
.header .subtitle {
  color: #e9ecef;
  font-size: 0.9rem;
  margin: 0;
}

/* 메인 컨텐츠 영역 */
.main-content {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 30px;
}

/* --- 상단: 정보 리스트 영역 --- */
.tab-buttons {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}
.tab-buttons button {
  flex: 1;
  background-color: #ffffff;
  border: 1px solid #dee2e6;
  padding: 12px;
  border-radius: 8px;
  font-weight: 600;
  color: #495057;
  cursor: pointer;
  transition: all 0.2s;
}
.tab-buttons button.active {
  background-color: #F5A623;
  color: #2b1b46;
  border-color: #F5A623;
}

/* 🔥 핵심: 스크롤이 고정된 리스트 컨테이너 */
.list-container {
  background: #ffffff;
  border: 1px solid #dee2e6;
  border-radius: 12px;
  height: 450px; /* 높이 고정! 이 안에서만 스크롤됨 */
  overflow-y: auto;
  box-shadow: 0 2px 4px rgba(0,0,0,0.02);
}
.list-item {
  display: flex;
  padding: 15px;
  border-bottom: 1px solid #f1f3f5;
  transition: background-color 0.2s;
}
.list-item:hover {
  background-color: #f8f9fa;
}
.item-img {
  width: 80px;
  height: 80px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
  margin-right: 15px;
}
.no-img {
  background-color: #e9ecef;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  color: #adb5bd;
}
.item-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.item-category {
  font-size: 0.7rem;
  color: #F5A623;
  font-weight: 700;
  margin-bottom: 4px;
}
.item-title {
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0 0 5px 0;
  color: #212529;
}
.item-address {
  font-size: 0.85rem;
  color: #6c757d;
  margin: 0;
}
.status-box {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #868e96;
}

/* --- 하단: 커뮤니티 게시판 영역 --- */
.board-section {
  background: #ffffff;
  border: 1px solid #dee2e6;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.02);
}
.section-header h2 {
  font-size: 1.3rem;
  color: #2b1b46;
  margin: 0 0 15px 0;
}
.board-container {
  max-height: 250px; /* 게시판도 뷰 높이 고정 */
  overflow-y: auto;
  border-top: 2px solid #2b1b46;
  margin-bottom: 15px;
}
.board-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 12px 0;
  border-bottom: 1px solid #f1f3f5;
}
.board-content h4 {
  margin: 0 0 5px 0;
  font-size: 1rem;
  color: #212529;
}
.board-content p {
  margin: 0;
  font-size: 0.85rem;
  color: #6c757d;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 1; /* 한 줄만 표시 */
  -webkit-box-orient: vertical;
}
.board-time {
  font-size: 0.75rem;
  color: #adb5bd;
  white-space: nowrap;
  margin-left: 10px;
}

/* 빠른 글쓰기 인풋 */
.quick-write {
  display: flex;
  gap: 10px;
}
.quick-write input {
  flex: 1;
  padding: 12px;
  border: 1px solid #ced4da;
  border-radius: 6px;
  outline: none;
}
.quick-write input:focus {
  border-color: #2b1b46;
}
.quick-write button {
  background-color: #2b1b46;
  color: white;
  border: none;
  padding: 0 20px;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
}

/* 우측 하단 챗봇 */
.chatbot-floating {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}
.chat-btn {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background-color: #F5A623;
  border: 2px solid #2b1b46;
  font-size: 1.8rem;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(0,0,0,0.2);
}
.chat-window {
  width: 300px;
  background: white;
  border: 1px solid #2b1b46;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 10px;
  box-shadow: 0 5px 15px rgba(0,0,0,0.2);
}
.chat-header {
  background: #2b1b46;
  color: white;
  padding: 10px 15px;
  display: flex;
  justify-content: space-between;
  font-weight: bold;
}
.chat-header button {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
}
.chat-body {
  padding: 15px;
  background: #f8f9fa;
  min-height: 150px;
}
.bot-msg {
  background: white;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #e9ecef;
  font-size: 0.9rem;
  margin: 0;
}
.chat-input {
  display: flex;
  border-top: 1px solid #e9ecef;
}
.chat-input input {
  flex: 1;
  padding: 10px;
  border: none;
  outline: none;
}
.chat-input button {
  background: #F5A623;
  border: none;
  color: #2b1b46;
  font-weight: bold;
  padding: 0 15px;
  cursor: pointer;
}
</style>