<template>
  <fallback-url-setting
    get-url="setting/telnyx/twiml/get"
    save-url="setting/telnyx/twiml/fallback"
    main-path="data.data.voice_url"
    fallback-path="data.data.voice_fallback_url"
    success-message="TeXML Setting updated successfully!"
  />
</template>
<script>
import FallbackUrlSetting from '../FallbackUrlSetting.vue'
export default { components: { FallbackUrlSetting } }
</script>
