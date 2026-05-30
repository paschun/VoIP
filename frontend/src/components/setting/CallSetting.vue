<template>
  <div>
    <twiml-setting v-if="setting?.type === 'twilio'" />
    <message-setting v-if="setting?.type === 'telnyx'" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { EventBus } from '@/event-bus'
import { parseJSON } from '@/helper'
import MessageSetting from './call/telnyx/MessageSetting.vue'
import TwimlSetting from './call/twilio/TwimlSetting.vue'

export default defineComponent({
  components: { MessageSetting, TwimlSetting },
  data () {
    return { setting: null as Record<string, any> | null }
  },
  mounted () {
    EventBus.$on('changeProfile', this.getCallSetting)
    this.getCallSetting()
  },
  methods: {
    getCallSetting () {
      const profileLocal = parseJSON(localStorage.getItem('activeProfile'))
      console.log('localStorage.activeProfile', profileLocal)
      if (profileLocal) this.setting = profileLocal
    }
  }
})
</script>
