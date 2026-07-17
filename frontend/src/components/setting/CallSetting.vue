<template>
  <div>
    <twiml-setting v-if="profileStore.activeProfileType === 'twilio'" />
    <message-setting v-if="profileStore.activeProfileType === 'telnyx'" />
  </div>
</template>

<script lang="ts">
/** No backend calls of its own: renders the provider settings for the active profile's type (useProfileStore). */
import { defineComponent } from 'vue'
import { useProfileStore } from '@/stores/profile.ts'
import MessageSetting from './call/telnyx/MessageSetting.vue'
import TwimlSetting from './call/twilio/TwimlSetting.vue'

export default defineComponent({
  components: { MessageSetting, TwimlSetting },
  setup() {
    return { profileStore: useProfileStore() }
  },
})
</script>
