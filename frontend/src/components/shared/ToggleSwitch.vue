<template>
  <label class="switch-label">
    <input v-model="checked" type="checkbox" class="switch-checkbox">
    <span class="d-flex"><slot name="on"></slot></span>
    <span class="d-flex"><slot name="off"></slot></span>
    <div class="switch-toggle" :class="{ 'switch-toggle-checked': checked }"></div>
  </label>
</template>

<script setup lang="ts">
/** Sliding pill switch. The checkbox lives inside the label, so no id/for pair is needed per instance. */
const checked = defineModel<boolean>()

const {
  size = '80px',
  trackColor = 'var(--background-color-secondary)',
  knobColor = 'var(--contact-highlighted)',
} = defineProps<{
  /** Pill width; every other dimension scales from it. */
  size?: string
  trackColor?: string
  knobColor?: string
}>()
</script>

<style scoped>
.switch-checkbox {
  display: none;
}

.switch-label {
  --width: v-bind(size);
  --height: calc(var(--width) * 0.475);
  --border-width: calc(var(--width) * 0.02);
  --pad: calc(var(--width) * 0.08);
  --knob: calc(var(--height) - 2 * var(--pad));

  align-items: center;
  background: v-bind(trackColor);
  border: var(--border-width) solid var(--accent-color);
  border-radius: var(--width);
  cursor: pointer;
  display: flex;
  font-size: calc(var(--width) * 0.24);
  height: var(--height);
  position: relative;
  padding: var(--pad);
  transition: background 0.5s ease;
  justify-content: space-between;
  width: var(--width);
  z-index: 1;
}

.switch-toggle {
  position: absolute;
  background-color: v-bind(knobColor);
  border-radius: 50%;
  top: calc(var(--pad) - var(--border-width));
  left: calc(var(--pad) - var(--border-width));
  height: var(--knob);
  width: var(--knob);
  transform: translateX(0);
  transition:
    transform 0.3s ease,
    background-color 0.5s ease;
}

.switch-toggle-checked {
  transform: translateX(calc(var(--width) - var(--knob) - 2 * var(--pad)));
}
</style>
