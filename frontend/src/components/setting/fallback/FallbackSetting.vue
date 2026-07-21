<template>
  <div>
    <TwilioTwimlSetting v-if="profileStore.activeProfileType === 'twilio'" />
    <TelnyxMessageSetting v-if="profileStore.activeProfileType === 'telnyx'" />
  </div>
</template>

<script setup lang="ts">
/** No backend calls of its own: renders the provider settings for the active profile's type (useProfileStore). */
import { useProfileStore } from '@/stores/profile.ts'
import TelnyxMessageSetting from './TelnyxMessageSetting.vue'
import TwilioTwimlSetting from './TwilioTwimlSetting.vue'

const profileStore = useProfileStore()
</script>
