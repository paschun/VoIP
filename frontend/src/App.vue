<template>
  <div id="app">
    <span v-if="old_version" class="update_ribbon"><a href="https://github.com/0perationPrivacy/VoIP/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer">update</a></span>
    <router-view/>
  </div>
</template>

<script>
import { get } from './core/module/common.module'

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
      const request = {
        url: 'auth/get-update-version'
      }
      this.$store
        .dispatch(get, request)
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
