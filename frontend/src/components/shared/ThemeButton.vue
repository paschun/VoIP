<template>
  <div>
    <input id="checkbox" type="checkbox" class="switch-checkbox" :checked="isDark" @change="toggleColorMode">
    <label for="checkbox" class="switch-label switch-label-mode">
      <span>🌙</span>
      <span>☀️</span>
      <div class="switch-toggle" :class="{ 'switch-toggle-checked': isDark }"></div>
    </label>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { colorMode, toggleColorMode } from '@/core/theme.ts'

const isDark = computed(() => colorMode.state.value === 'dark')
</script>

<style scoped>
.switch-checkbox {
  display: none;
}

/* Compound selector so the fixed pill size beats `.switch-label`'s var-based width/height by specificity. */
.switch-label.switch-label-mode {
  height: 38px;
  width: 80px;
  float: right;
}

.switch-label {
  align-items: center;
  background: var(--text-primary-color);
  border: calc(var(--element-size) * 0.025) solid var(--accent-color);
  border-radius: var(--element-size);
  cursor: pointer;
  display: flex;
  font-size: calc(var(--element-size) * 0.3);
  height: calc(var(--element-size) * 0.35);
  position: relative;
  padding: calc(var(--element-size) * 0.1);
  transition: background 0.5s ease;
  justify-content: space-between;
  width: var(--element-size);
  z-index: 1;
}

.switch-toggle {
  position: absolute;
  background-color: var(--background-color-primary);
  border-radius: 50%;
  top: calc(var(--element-size) * 0.07);
  left: calc(var(--element-size) * 0.07);
  height: calc(var(--element-size) * 0.4);
  width: calc(var(--element-size) * 0.4);
  transform: translateX(0);
  transition:
    transform 0.3s ease,
    background-color 0.5s ease;
}

.switch-toggle-checked {
  transform: translateX(calc(var(--element-size) * 0.6));
}
</style>
