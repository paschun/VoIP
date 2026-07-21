<template>
  <ToggleSwitch
    v-model="isDark"
    class="float-end"
    track-color="var(--text-primary-color)"
    knob-color="var(--background-color-primary)"
  >
    <template #on><span>🌙</span></template>
    <template #off><span>☀️</span></template>
  </ToggleSwitch>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { colorMode } from '@/core/theme.ts'
import ToggleSwitch from '@/components/shared/ToggleSwitch.vue'

const isDark = computed({
  get: () => colorMode.state.value === 'dark',
  set: (dark: boolean) => {
    colorMode.value = dark ? 'dark' : 'light'
  },
})
</script>
