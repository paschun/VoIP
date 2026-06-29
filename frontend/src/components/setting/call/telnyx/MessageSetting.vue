<template>
  <fallback-url-setting
    resource="provider/telnyx/webhook"
    main-path="data.webhook_url"
    fallback-path="data.webhook_failover_url"
    main-label="Primary Webhook URL"
    success-message=" Profile updated successfully!"
    normalize-host
    normalize-submit
  />
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import FallbackUrlSetting from '../FallbackUrlSetting.vue'
export default defineComponent({ components: { FallbackUrlSetting } })
</script>
