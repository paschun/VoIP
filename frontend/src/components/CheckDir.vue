<template>
  <div></div>
</template>

<script>
import { post } from '../core/module/common.module'

export default {
  mounted () {
    this.checkDirectoryName()
  },
  methods: {
    checkDirectoryName () {
      const request = {
        url: 'auth/check-directoryname',
        data: { dirname: this.$route.params.appdirectory }
      }
      this.$store
        .dispatch(post, request)
        .then((response) => {
          console.log('CheckDir', response)
          const status = response?.data?.status
          if (status === 'nodir' || status === 'no-name') {
            this.$router.push('/voip/dashboard')
          } else if (status === 'false') {
            this.$router.push('/404')
          }
        })
        .catch((e) => console.error(e))
    }
  }
}
</script>
