<template>
  <BApp>
    <div id="app">
      <span v-if="meta.updateAvailable" class="update-ribbon"
        ><a href="https://github.com/paschun/VoIP" target="_blank" rel="noopener noreferrer">update</a></span
      >
      <RouterView />
    </div>
  </BApp>
</template>

<script setup lang="ts">
import { BApp } from 'bootstrap-vue-next'
import { useServerMetaStore } from '@/stores/server-meta.ts'

const meta = useServerMetaStore()
</script>

<style scoped>
.update-ribbon {
  z-index: 99;
  position: fixed;
  width: auto;
  height: 12px;
  padding-right: 10px;
  padding-left: 10px;
  background: var(--theme-orange);
  top: 0;
  right: 160px;
  text-align: center;
  font-size: 8px;
  text-transform: uppercase;
  font-weight: 600;
  color: wheat;
  line-height: 11px;
}
.update-ribbon a {
  color: inherit;
  text-decoration: none;
}
</style>
