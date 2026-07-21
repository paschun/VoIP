<template>
  <ProviderWebhookSetting
    provider="twilio"
    main-label="Request URL"
    fallback-label="Fallback URL"
    fallback-placeholder="Enter Fallback Url"
    success-message="TwiML Setting updated successfully!"
    required-message="Twiml Fallback Url Is Required"
    invalid-message="Please enter valid Twiml Fallback Url"
  />
</template>

<script setup lang="ts">
import ProviderWebhookSetting from './ProviderWebhookSetting.vue'
</script>
