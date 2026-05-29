<template>
  <fallback-url-setting
    get-url="setting/telnyx/sip/get"
    save-url="setting/telnyx/sip/fallback"
    main-path="data.data.webhook_event_url"
    fallback-path="data.data.webhook_event_failover_url"
    success-message="SIP Setting updated successfully!"
    fallback-placeholder="Enter Twiml Fallback Url"
    required-message="Twiml Fallback Url Is Required"
    invalid-message="Please enter valid Twiml Fallback Url"
  />
</template>

<script>
import FallbackUrlSetting from '../FallbackUrlSetting.vue'
export default { components: { FallbackUrlSetting } }
</script>
