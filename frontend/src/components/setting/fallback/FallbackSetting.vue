<template>
  <div>
    <twilio-twiml-setting v-if="profileStore.activeProfileType === 'twilio'" />
    <telnyx-message-setting v-if="profileStore.activeProfileType === 'telnyx'" />
  </div>
</template>

<script lang="ts">
/** No backend calls of its own: renders the provider settings for the active profile's type (useProfileStore). */
import { defineComponent } from 'vue'
import { useProfileStore } from '@/stores/profile.ts'
import TelnyxMessageSetting from './TelnyxMessageSetting.vue'
import TwilioTwimlSetting from './TwilioTwimlSetting.vue'

export default defineComponent({
  components: { TelnyxMessageSetting, TwilioTwimlSetting },
  setup() {
    return { profileStore: useProfileStore() }
  },
})
</script>
