<!--
  비밀번호 검증 모달 — 수정·삭제가 공유한다. FE v6 한지(hanji) 테마에 맞춰 스타일링.
  검증은 부모(BoardSection)가 한다: 입력값을 submit 으로 넘기기만 한다. (평문 비교 — RFP III-2-나)
-->
<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
})
const emit = defineEmits(['submit', 'close'])

const password = ref('')

watch(
  () => props.visible,
  (open) => {
    if (open) password.value = ''
  },
)

const submit = () => emit('submit', password.value)
</script>

<template>
  <div v-if="visible" class="pm-backdrop" @click.self="emit('close')">
    <div class="pm-box">
      <div class="pm-head">
        <span>🔒 비밀번호 확인</span>
        <button class="pm-x" @click="emit('close')">✕</button>
      </div>
      <div class="pm-body">
        <p class="pm-desc">게시글 작성 시 설정한 비밀번호를 입력하세요.</p>
        <input
          type="password"
          v-model="password"
          placeholder="비밀번호 입력"
          class="pm-input"
          @keyup.enter="submit"
        />
      </div>
      <div class="pm-foot">
        <button class="pm-btn ghost" @click="emit('close')">닫기</button>
        <button class="pm-btn solid" @click="submit">확인</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pm-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(30, 28, 26, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 200;
}
.pm-box {
  width: 100%;
  max-width: 320px;
  background: #fffdf9;
  border: 2px solid #2d2a26;
  box-shadow: 6px 6px 0 rgba(45, 42, 38, 0.12);
}
.pm-head {
  background: #1e1c1a;
  color: #f4f1ea;
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 700;
  font-size: 0.9rem;
  border-bottom: 2px solid #2b5b53;
}
.pm-x {
  background: none;
  border: none;
  color: #f4f1ea;
  cursor: pointer;
  font-size: 1rem;
}
.pm-body {
  padding: 18px 16px;
}
.pm-desc {
  margin: 0 0 12px;
  font-size: 0.8rem;
  color: #7a7469;
}
.pm-input {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border: 1px solid #c4beb1;
  background: #faf9f6;
  outline: none;
  text-align: center;
  letter-spacing: 0.2em;
  font-family: monospace;
}
.pm-input:focus {
  border-color: #2b5b53;
}
.pm-foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid #e5e1d8;
}
.pm-btn {
  padding: 8px 16px;
  border: none;
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
}
.pm-btn.ghost {
  background: #fff;
  border: 1px solid #c4beb1;
  color: #5c564d;
}
.pm-btn.solid {
  background: #2b5b53;
  color: #f4f1ea;
}
.pm-btn.solid:hover {
  background: #1e1c1a;
}
</style>
