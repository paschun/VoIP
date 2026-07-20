<template>
  <div>
    <div v-for="(row, i) in rows" :key="i" class="d-flex justify-content-between" :class="{ 'mt-4': i === 0 }">
      <div v-for="[key, alpha] in row" :key="key">
        <a class="btn btn-light-primary dialer-btn" @click="press(key)">
          <p class="number font-weight-bolder mb-0">{{ key }}</p>
          <p v-if="alpha !== undefined" class="alpha" :class="{ hide: !alpha }">{{ alpha }}</p>
        </a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/** The 12-key dial pad. Emits `press` per key; the parent decides between number entry and DTMF. */
import type { DialKey } from '@/stores/call.ts'

// '1' has an empty alpha: it still renders hidden so that the button matches the height of 2-9.
const rows: [DialKey, string?][][] = [
  [
    ['1', ''],
    ['2', 'abc'],
    ['3', 'def'],
  ],
  [
    ['4', 'ghi'],
    ['5', 'jkl'],
    ['6', 'mno'],
  ],
  [
    ['7', 'pqrs'],
    ['8', 'tuv'],
    ['9', 'wxyz'],
  ],
  [['*'], ['0'], ['#']],
]

const emit = defineEmits<{ press: [key: DialKey] }>()

function press(key: DialKey) {
  emit('press', key)
}
</script>

<style scoped>
.number {
  margin-bottom: 0;
  font-size: 40px;
  line-height: 30px;
}
.alpha {
  margin-bottom: auto;
}
.alpha.hide {
  visibility: hidden;
}
.dialer-btn {
  color: var(--text-button);
  margin: 1rem;
}
.dialer-btn:hover {
  color: var(--text-button);
}
.dialer-btn:active {
  color: #212529;
}
</style>
