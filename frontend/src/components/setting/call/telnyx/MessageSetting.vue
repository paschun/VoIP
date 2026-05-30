<template>
  <fallback-url-setting
    get-url="setting/telnyx/message/get"
    save-url="setting/telnyx/message/fallback"
    main-path="data.data.webhook_url"
    fallback-path="data.data.webhook_failover_url"
    main-label="Primary Webhook URL"
    success-message=" Profile updated successfully!"
    normalize-host
    normalize-submit
  />
</template>

<script>
import FallbackUrlSetting from '../FallbackUrlSetting.vue'
export default { components: { FallbackUrlSetting } }
</script>
