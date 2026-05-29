<template>
    <div>
      <div v-if="setting && setting.type === 'twilio'">
        <!-- <twilio-setting></twilio-setting> -->
        <twiml-setting></twiml-setting>
      </div>
      <div v-if="setting && setting.type === 'telnyx'">
        <message-setting></message-setting>
      </div>
    </div>
</template>

<script>
import { EventBus } from '@/event-bus'
import MessageSetting from './call/telnyx/MessageSetting.vue'
import TwimlSetting from './call/twilio/TwimlSetting.vue'
export default {
  components: { MessageSetting, TwimlSetting },
  data () {
    return {
      setting: null,
      activeMenu: 'setting'
    }
  },
  mounted: function () {
    console.log('load data')
    EventBus.$on('changeProfile', this.getCallSetting)
    this.getCallSetting()
  },
  methods: {
    getCallSetting () {
      const profileLocal = JSON.parse(localStorage.getItem('activeProfile'))
      console.log(profileLocal)
      if (profileLocal) {
        this.setting = profileLocal
      }
    },
    enableMenu (menu) {
      this.activeMenu = menu
    }
  }
}
</script>
