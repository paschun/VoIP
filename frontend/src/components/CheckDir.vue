<template>
  <div></div>
</template>

<script>

export default {
  mounted () {
    this.checkDirectoryName()
  },
  methods: {
    checkDirectoryName () {
      this.$post('auth/check-directoryname', { dirname: this.$route.params.appdirectory })
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
