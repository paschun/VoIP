<template>
  <div>
    <twiml-setting v-if="setting?.type === 'twilio'" />
    <message-setting v-if="setting?.type === 'telnyx'" />
  </div>
</template>

<script>
import { EventBus } from '@/event-bus'
import MessageSetting from './call/telnyx/MessageSetting.vue'
import TwimlSetting from './call/twilio/TwimlSetting.vue'

export default {
  components: { MessageSetting, TwimlSetting },
  data () {
    return { setting: null }
  },
  mounted () {
    EventBus.$on('changeProfile', this.getCallSetting)
    this.getCallSetting()
  },
  methods: {
    getCallSetting () {
      const profileLocal = JSON.parse(localStorage.getItem('activeProfile'))
      console.log('localStorage.activeProfile', profileLocal)
      if (profileLocal) this.setting = profileLocal
    }
  }
}
</script>
