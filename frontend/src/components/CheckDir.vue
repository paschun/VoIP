<template>
  <div></div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { appDirectory } from '@/router/helpers.ts'
import { client, request } from '@/core/rpc.client.ts'

export default defineComponent({
  mounted () {
    this.checkDirectoryName()
  },
  methods: {
    async checkDirectoryName () {
      const { data } = await request(client.api.auth['directory-name'].$get({ query: { name: appDirectory(this.$route) } }))
      if (data.status === 'nodir' || data.status === 'no-name') {
        this.$router.push({ name: 'dashboard', params: { appdirectory: 'voip' } })
      } else if (data.status === 'false') {
        this.$router.push({ name: 'error' })
      }
    }
  }
})
</script>
