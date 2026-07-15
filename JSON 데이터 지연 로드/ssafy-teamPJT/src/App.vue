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
      <!-- 6개 카테고리 탭 버튼 -->
      <section class="info-section">
        <div class="tab-grid">
          <button 
            v-for="cat in categories" 
            :key="cat.file"
            :class="{ active: currentTab === cat.file }" 
            @click="fetchData(cat.file)"
          >
            {{ cat.name }}
          </button>
        </div>

        <!-- 데이터 리스트 컨테이너 -->
        <div class="list-container" id="explore-section">
          <div v-if="isLoading" class="status-box">
            <p>데이터를 불러오는 중입니다...</p>
          </div>
          
          <div v-else-if="items.length > 0" class="list-wrapper">
            <div v-for="item in items" :key="item.contentid" class="list-item">
              <img v-if="item.firstimage" :src="item.firstimage" alt="명소 이미지" class="item-img" />
              <div v-else class="item-img no-img">이미지 없음</div>
              
              <div class="item-info">
                <span class="item-category">{{ getCategoryName(currentTab) }}</span>
                <h3 class="item-title">{{ item.title }}</h3>
                <p class="item-address">📍 {{ item.addr1 }}</p>
              </div>
            </div>
          </div>

          <div v-else class="status-box empty">
            <p>👆 카테고리를 선택해 정보를 확인해보세요.</p>
          </div>
        </div>
      </section>

      <!-- 하단: 실시간 게시판 -->
      <section class="board-section">
        <div class="section-header">
          <h2>💬 실시간 로컬 커뮤니티</h2>
        </div>
        <div class="board-container">
          <div v-for="post in posts" :key="post.id" class="board-item">
            <div class="board-content">
              <h4>{{ post.title }}</h4>
              <p>{{ post.content }}</p>
            </div>
            <span class="board-time">{{ post.time }}</span>
          </div>
        </div>
        <div class="quick-write">
          <input type="text" v-model="newPost" placeholder="서울에서의 경험을 짧게 남겨주세요!" @keyup.enter="addPost" />
          <button @click="addPost">등록</button>
        </div>
      </section>
    </main>

    <!-- 챗봇 -->
    <div class="chatbot-floating">
      <div v-if="isChatOpen" class="chat-window">
        <div class="chat-header">
          <span>AI 도우미</span>
          <button @click="isChatOpen = false">✕</button>
        </div>
        <div class="chat-body">
          <p class="bot-msg">어떤 카테고리가 가장 궁금하신가요?</p>
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

const categories = [
  { name: '관광지', file: '서울_관광지' },
  { name: '레포츠', file: '서울_레포츠' },
  { name: '문화시설', file: '서울_문화시설' },
  { name: '숙박', file: '서울_숙박' },
  { name: '여행코스', file: '서울_여행코스' },
  { name: '축제/공연', file: '서울_축제공연행사' }
];

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

const getCategoryName = (file) => {
  const cat = categories.find(c => c.file === file);
  return cat ? cat.name : '';
};

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
    console.warn("데이터 로드 실패.");
  } finally {
    isLoading.value = false;
  }
};

const addPost = () => {
  if (!newPost.value.trim()) return;
  posts.value.unshift({ id: Date.now(), title: '새로운 제보', content: newPost.value, time: '방금 전' });
  newPost.value = '';
};


</script>

<style scoped>

.app-wrapper {
  background-color: #F4F1EA; /* 따뜻한 한지 톤 */
  min-height: 100vh;
  font-family: 'Pretendard', sans-serif;
  color: #2D2A26; /* 먹물 같은 딥 차콜 */
  padding-bottom: 80px;
}

.header {
  background-color: #1E1C1A; /* 먹물 차콜 */
  padding: 24px 20px;
  text-align: center;
  border-bottom: 3px solid #2B5B53; /* 차분한 단청 청록색 */
}
.header .logo {
  color: #F4F1EA;
  font-size: 1.8rem;
  font-weight: 700;
  margin: 0 0 5px 0;
  letter-spacing: 2px; /* 정갈한 자간 */
}
.header .logo span {
  color: #2B5B53; /* 청록색 포인트 */
}
.header .subtitle {
  color: #9E988F;
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
  grid-template-columns: repeat(3, 1fr); /* 3x2 그리드로 깔끔하게 */
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
  background: #2B5B53;
  color: white;
}

.list-container {
  background: #FFFFFF;
  border: 1px solid #2D2A26; /* 진한 먹물 테두리 */
  border-radius: 0; /* 직각 */
  height: 450px;
  overflow-y: auto;
  box-shadow: 4px 4px 0px rgba(45, 42, 38, 0.1); /* 전통 가구 느낌의 솔리드 그림자 */
}
.list-item {
  display: flex;
  padding: 20px;
  border-bottom: 1px solid #E5E1D8;
  transition: background-color 0.2s;
}
.list-item:hover {
  background-color: #FAF9F6;
}
.item-img {
  width: 90px;
  height: 90px;
  border-radius: 0; /* 직각 이미지 */
  object-fit: cover;
  flex-shrink: 0;
  margin-right: 20px;
  border: 1px solid #E5E1D8;
}
.no-img {
  background-color: #E5E1D8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  color: #8C867A;
}
.item-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.item-category {
  font-size: 0.75rem;
  color: #2B5B53;
  font-weight: 700;
  margin-bottom: 6px;
  letter-spacing: 1px;
}
.item-title {
  font-size: 1.15rem;
  font-weight: 700;
  margin: 0 0 8px 0;
  color: #2D2A26;
}
.item-address {
  font-size: 0.85rem;
  color: #7A7469;
  margin: 0;
}
.status-box {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #7A7469;
}

.board-section {
  background: #FFFFFF;
  border: 1px solid #2D2A26;
  border-radius: 0; /* 직각 */
  padding: 25px;
  box-shadow: 4px 4px 0px rgba(45, 42, 38, 0.1);
}
.section-header h2 {
  font-size: 1.3rem;
  color: #1E1C1A;
  margin: 0 0 20px 0;
  border-left: 4px solid #2B5B53;
  padding-left: 10px;
}
.board-container {
  max-height: 250px;
  overflow-y: auto;
  border-top: 1px solid #2D2A26;
  margin-bottom: 20px;
}
.board-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px 0;
  border-bottom: 1px dashed #D1CCC2; /* 점선으로 전통적인 느낌 부각 */
}
.board-content h4 {
  margin: 0 0 8px 0;
  font-size: 1.05rem;
  color: #2D2A26;
}
.board-content p {
  margin: 0;
  font-size: 0.9rem;
  color: #5C564D;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
}
.board-time {
  font-size: 0.75rem;
  color: #8C867A;
  white-space: nowrap;
  margin-left: 15px;
}

.quick-write {
  display: flex;
  gap: 10px;
}
.quick-write input {
  flex: 1;
  padding: 12px 15px;
  border: 1px solid #C4BEB1;
  border-radius: 0; /* 직각 */
  outline: none;
  background-color: #FAF9F6;
  color: #2D2A26;
}
.quick-write input:focus {
  border-color: #2B5B53;
}
.quick-write button {
  background-color: #1E1C1A;
  color: #F4F1EA;
  border: none;
  padding: 0 25px;
  border-radius: 0; /* 직각 */
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.2s;
}
.quick-write button:hover {
  background-color: #2B5B53;
}

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
  border-radius: 0; /* 동그라미 대신 도장(낙관) 느낌의 사각형 */
  background-color: #2B5B53;
  border: 2px solid #1E1C1A;
  font-size: 1.8rem;
  cursor: pointer;
  box-shadow: 4px 4px 0px rgba(45, 42, 38, 0.15);
  transition: transform 0.1s;
}
.chat-btn:active {
  transform: translate(2px, 2px);
  box-shadow: 2px 2px 0px rgba(45, 42, 38, 0.15);
}
.chat-window {
  width: 320px;
  background: #FFFFFF;
  border: 2px solid #2D2A26;
  border-radius: 0; /* 직각 */
  overflow: hidden;
  margin-bottom: 15px;
  box-shadow: 6px 6px 0px rgba(45, 42, 38, 0.1);
}
.chat-header {
  background: #1E1C1A;
  color: #F4F1EA;
  padding: 12px 20px;
  display: flex;
  justify-content: space-between;
  font-weight: bold;
  border-bottom: 2px solid #2B5B53;
}
.chat-header button {
  background: none;
  border: none;
  color: #F4F1EA;
  cursor: pointer;
  font-size: 1.2rem;
}
.chat-body {
  padding: 20px;
  background: #F4F1EA;
  min-height: 180px;
}
.bot-msg {
  background: #FFFFFF;
  padding: 12px 15px;
  border-radius: 0; /* 직각 말풍선 */
  border: 1px solid #D1CCC2;
  font-size: 0.9rem;
  margin: 0;
  color: #2D2A26;
  border-left: 3px solid #2B5B53;
}
.chat-input {
  display: flex;
  border-top: 1px solid #D1CCC2;
}
.chat-input input {
  flex: 1;
  padding: 12px 15px;
  border: none;
  outline: none;
  background: #FFFFFF;
}
.chat-input button {
  background: #2B5B53;
  border: none;
  border-left: 1px solid #D1CCC2;
  color: #F4F1EA;
  font-weight: bold;
  padding: 0 20px;
  cursor: pointer;
}
</style>