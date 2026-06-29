<template>
  <div id="app">
    <span v-if="old_version" class="update_ribbon"><a href="https://github.com/paschun/VoIP" target="_blank" rel="noopener noreferrer">update</a></span>
    <router-view/>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { client, request } from '@/core/rpc.client.ts'

export default defineComponent({
  name: 'App',
  data () {
    return {
      old_version: false
    }
  },
  mounted () {
    this.getVersion()
  },
  methods: {
    async getVersion () {
      const res = await request(client.api.auth.version['update-available'].$get())
      this.old_version = res.data
    }
  }
})
</script>
