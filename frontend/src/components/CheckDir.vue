<template>
  <div></div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { appDirectory } from '@/router/helpers.ts'

export default defineComponent({
  mounted () {
    this.checkDirectoryName()
  },
  methods: {
    checkDirectoryName () {
      this.$get('auth/directory-name?name=' + encodeURIComponent(appDirectory(this.$route)))
        .then((response) => {
          console.log('CheckDir', response)
          const status = response?.data?.status
          if (status === 'nodir' || status === 'no-name') {
            this.$router.push({ name: 'dashboard', params: { appdirectory: 'voip' } })
          } else if (status === 'false') {
            this.$router.push({ name: 'error' })
          }
        })
        .catch((e) => console.error(e))
    }
  }
})
</script>
