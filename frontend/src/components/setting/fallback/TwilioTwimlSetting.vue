<template>
  <provider-webhook-setting
    provider="twilio"
    main-label="Request URL"
    fallback-label="Fallback URL"
    fallback-placeholder="Enter Fallback Url"
    success-message="TwiML Setting updated successfully!"
    required-message="Twiml Fallback Url Is Required"
    invalid-message="Please enter valid Twiml Fallback Url"
  />
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import ProviderWebhookSetting from './ProviderWebhookSetting.vue'
export default defineComponent({ components: { ProviderWebhookSetting } })
</script>
