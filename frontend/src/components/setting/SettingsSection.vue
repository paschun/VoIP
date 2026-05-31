<template>
  <div>
    <div class="d-flex justify-content-between">
      <div class="p-2 bd-highlight"><component :is="titleTag">{{ title }}</component></div>
      <div class="p-2 bd-highlight">
        <i-bi-arrow-left
          :style="{ cursor: 'pointer', fontSize: iconScale + 'em' }"
          aria-hidden="true"
          @click="$emit('back')"
        />
      </div>
    </div>
    <slot />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
/**
 * Standard "section header with back arrow" layout used by the settings
 * sidebars. Slot is the section body.
 */
export default defineComponent({
  name: 'SettingsSection',
  emits: ['back'],
  props: {
    title: { type: String, required: true },
    titleTag: { type: String, default: 'h4' },
    iconScale: { type: [String, Number], default: 2 }
  }
})
</script>
