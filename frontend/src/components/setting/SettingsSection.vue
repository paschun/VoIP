<template>
  <div>
    <div class="d-flex justify-content-between">
      <div class="p-2 bd-highlight">
        <component :is="titleTag">{{ title }}</component>
      </div>
      <div class="p-2 bd-highlight">
        <IBiArrowLeft class="cursor-pointer back-icon" aria-hidden="true" @click="$emit('back')" />
      </div>
    </div>
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
/**
 * Standard "section header with back arrow" layout used by the settings sidebars. Slot is the section body.
 */
import { computed } from 'vue'

const props = withDefaults(defineProps<{ title: string; titleTag?: string; iconScale?: number }>(), {
  titleTag: 'h4',
  iconScale: 2,
})
defineEmits<{ back: [] }>() // back event has no payload

const iconFontSize = computed(() => `${props.iconScale}em`)
</script>

<style scoped>
.back-icon {
  font-size: v-bind(iconFontSize);
}
</style>
