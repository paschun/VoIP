<template>
  <fallback-url-setting
    get-url="setting/twilio/twiml/get"
    save-url="setting/twilio/twiml/fallback"
    main-path="data.voiceUrl"
    fallback-path="data.voiceFallbackUrl"
    main-label="Request URL"
    fallback-label="Fallback URL"
    fallback-placeholder="Enter Fallback Url"
    success-message="TwiML Setting updated successfully!"
    required-message="Twiml Fallback Url Is Required"
    invalid-message="Please enter valid Twiml Fallback Url"
    normalize-host
  />
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import FallbackUrlSetting from '../FallbackUrlSetting.vue'
export default defineComponent({ components: { FallbackUrlSetting } })
</script>
