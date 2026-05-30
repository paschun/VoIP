<template>
  <div id="app">
    <span v-if="old_version" class="update_ribbon"><a href="https://github.com/0perationPrivacy/VoIP/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer">update</a></span>
    <router-view/>
  </div>
</template>

<script>

export default {
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
    getVersion () {
      this.$get('auth/get-update-version')
        .then((response) => {
          console.log('update available:', response.update)
          if (response.update === 'true') {
            this.old_version = true
          } else {
            this.old_version = false
          }
        })
        .catch((e) => {
          this.old_version = false
          console.error(e)
        })
    }
  }
}
</script>
