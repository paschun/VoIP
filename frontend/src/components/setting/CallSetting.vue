<template>
  <div>
    <twiml-setting v-if="setting?.type === 'twilio'" />
    <message-setting v-if="setting?.type === 'telnyx'" />
  </div>
</template>

<script lang="ts">
/**
 * No backend calls of its own: reads the active profile from the profile store
 * (useProfileStore) and uses it directly as the call setting.
 */
import { defineComponent } from 'vue'
import { mapStores } from 'pinia'
import { useProfileStore } from '@/stores/profile.ts'
import MessageSetting from './call/telnyx/MessageSetting.vue'
import TwimlSetting from './call/twilio/TwimlSetting.vue'

export default defineComponent({
  components: { MessageSetting, TwimlSetting },
  data () {
    return { setting: null as Record<string, any> | null }
  },
  computed: {
    ...mapStores(useProfileStore)
  },
  watch: {
    'profileStore.activeProfile' () {
      this.getCallSetting()
    }
  },
  mounted () {
    this.getCallSetting()
  },
  methods: {
    getCallSetting () {
      const profile = this.profileStore.activeProfile
      if (profile) this.setting = profile
    }
  }
})
</script>
