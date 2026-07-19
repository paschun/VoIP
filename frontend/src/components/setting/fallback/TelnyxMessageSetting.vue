<template>
  <provider-webhook-setting
    provider="telnyx"
    main-label="Primary Webhook URL"
    success-message=" Profile updated successfully!"
  />
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import ProviderWebhookSetting from './ProviderWebhookSetting.vue'
export default defineComponent({ components: { ProviderWebhookSetting } })
</script>
