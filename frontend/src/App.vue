<template>
  <div id="app">
    <span v-if="meta.updateAvailable" class="update_ribbon"
      ><a href="https://github.com/paschun/VoIP" target="_blank" rel="noopener noreferrer">update</a></span
    >
    <router-view />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useServerMetaStore } from '@/stores/server-meta.ts'

export default defineComponent({
  name: 'App',
  setup() {
    return { meta: useServerMetaStore() }
  },
})
</script>
