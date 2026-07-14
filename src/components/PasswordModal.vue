<!--
  비밀번호 검증 모달 — 수정과 삭제가 공유한다 (board_demo.html 에서 이식).

  검증 자체는 부모(BoardView)가 한다: 이 컴포넌트는 입력된 비밀번호를 submit 으로 넘기기만 하고,
  수정인지 삭제인지 같은 맥락은 부모가 쥐고 있는다. (평문 비교 — RFP III-2-나 의도된 설계)
-->
<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
})
const emit = defineEmits(['submit', 'close'])

const password = ref('')

// 열릴 때마다 입력값을 비운다 — 이전 입력이 남지 않도록.
watch(
  () => props.visible,
  (open) => {
    if (open) password.value = ''
  },
)

function submit() {
  emit('submit', password.value)
}
</script>

<template>
  <div
    v-if="visible"
    class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
  >
    <div class="bg-white rounded-2xl w-full max-w-xs shadow-2xl border border-slate-100 overflow-hidden">
      <div class="p-4 border-b border-slate-100 flex items-center justify-between">
        <h2 class="text-xs font-bold text-slate-900 flex items-center gap-1.5">
          <svg class="w-4 h-4 text-indigo-500 stroke-current stroke-2 fill-none" viewBox="0 0 24 24">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          <span>비밀번호 검증</span>
        </h2>
        <button @click="emit('close')" class="text-slate-400 hover:text-slate-600 transition">
          <svg class="w-5 h-5 stroke-current stroke-2" viewBox="0 0 24 24">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="p-4 space-y-2.5">
        <p class="text-[10px] text-slate-500 leading-relaxed">게시글 작성 시 설정한 비밀번호를 입력하세요.</p>
        <input
          type="password"
          v-model="password"
          placeholder="비밀번호 입력..."
          class="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none text-center font-mono tracking-widest"
          @keyup.enter="submit"
        />
      </div>
      <div class="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-1.5">
        <button
          @click="emit('close')"
          class="px-3 py-1.5 text-[10px] font-semibold text-slate-500 hover:text-slate-800 transition"
        >
          닫기
        </button>
        <button
          @click="submit"
          class="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-semibold px-3 py-1.5 rounded-lg transition"
        >
          확인
        </button>
      </div>
    </div>
  </div>
</template>
