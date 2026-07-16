<template>
  <div id="app">
    <span v-if="versionStore.updateAvailable" class="update_ribbon"
      ><a href="https://github.com/paschun/VoIP" target="_blank" rel="noopener noreferrer">update</a></span
    >
    <router-view />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useVersionStore } from '@/stores/version.ts'

export default defineComponent({
  name: 'App',
  setup() {
    return { versionStore: useVersionStore() }
  },
  mounted() {
    this.versionStore.checkUpdateAvailable()
  },
})
</script>
