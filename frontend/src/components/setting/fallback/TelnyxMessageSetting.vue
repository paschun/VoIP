<template>
  <provider-webhook-setting
    provider="telnyx"
    main-label="Primary Webhook URL"
    success-message=" Profile updated successfully!"
  />
</template>

<script setup lang="ts">
import ProviderWebhookSetting from './ProviderWebhookSetting.vue'
</script>
