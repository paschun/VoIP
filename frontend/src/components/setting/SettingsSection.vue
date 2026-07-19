<template>
  <div>
    <div class="d-flex justify-content-between">
      <div class="p-2 bd-highlight">
        <component :is="titleTag">{{ title }}</component>
      </div>
      <div class="p-2 bd-highlight">
        <i-bi-arrow-left :style="{ cursor: 'pointer', fontSize: iconScale + 'em' }" aria-hidden="true" @click="$emit('back')" />
      </div>
    </div>
    <slot />
  </div>
</template>

<script setup lang="ts">
/**
 * Standard "section header with back arrow" layout used by the settings sidebars. Slot is the section body.
 */
withDefaults(defineProps<{ title: string; titleTag?: string; iconScale?: string | number }>(), { titleTag: 'h4', iconScale: 2 })
defineEmits<{ back: [] }>() // back event has no payload
</script>
