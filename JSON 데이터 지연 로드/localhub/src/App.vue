<template>
  <div class="container">
    <header class="header">
      <h1>LocalHub SEOUL</h1>
      <p>서울 권역 정보 공유 커뮤니티</p>
    </header>

    <main class="main-content">
      <div class="button-group">
        <button @click="fetchData('서울_관광지')">관광지 보기</button>
        <button @click="fetchData('서울_문화시설')">문화시설 보기</button>
      </div>

      <p v-if="isLoading" class="loading-msg">데이터를 불러오는 중입니다...</p>

      <div v-if="items.length > 0" class="card-grid">
        <div v-for="item in items" :key="item.contentid" class="card">
          <img v-if="item.firstimage" :src="item.firstimage" alt="대표 이미지" class="card-image" />
          <div v-else class="no-image">이미지 없음</div>
          
          <div class="card-info">
            <h3>{{ item.title }}</h3>
            <p>{{ item.addr1 }}</p>
          </div>
        </div>
      </div>

      <p v-else-if="!isLoading" class="empty-msg">카테고리 버튼을 클릭하여 정보를 확인하세요.</p>
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const items = ref([]); // 데이터를 담아둘 바구니
const isLoading = ref(false); // 로딩 상태

// public/data 폴더에서 JSON 데이터를 불러오는 핵심 함수!
const fetchData = async (fileName) => {
  isLoading.value = true;
  items.value = []; // 기존 데이터를 비움

  try {
    const response = await fetch(`/data/${fileName}.json`);
    const data = await response.json();
    items.value = data.items; // 받아온 데이터를 바구니에 쏙!
  } catch (error) {
    alert("데이터를 불러오는데 실패했습니다. (경로를 확인해주세요!)");
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
/* 화면을 예쁘게 꾸며주는 CSS 스타일 */
.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: sans-serif;
}
.header {
  background-color: #1a2b48;
  color: white;
  padding: 20px;
  border-radius: 12px;
  text-align: center;
  margin-bottom: 20px;
}
.button-group {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-bottom: 20px;
}
button {
  background-color: #ffbd59;
  border: none;
  padding: 10px 20px;
  border-radius: 20px;
  font-weight: bold;
  cursor: pointer;
}
button:hover {
  opacity: 0.8;
}
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
}
.card {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}
.card-image {
  width: 100%;
  height: 150px;
  object-fit: cover;
}
.no-image {
  width: 100%;
  height: 150px;
  background-color: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
}
.card-info {
  padding: 15px;
}
.card-info h3 {
  margin: 0 0 10px 0;
  font-size: 1.1rem;
}
.card-info p {
  margin: 0;
  font-size: 0.9rem;
  color: #6b7280;
}
.loading-msg, .empty-msg {
  text-align: center;
  margin-top: 50px;
  color: #6b7280;
}
</style>