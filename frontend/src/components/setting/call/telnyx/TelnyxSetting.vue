<template>
    <div class="p-2">
      <settings-section title="" title-tag="h6" :icon-scale="1" @back="enableMenu('setting')">
        <message-setting></message-setting>
      </settings-section>
      <settings-section v-if="activeMenu == 'twiml'" title="TwiML Setting" title-tag="h6" :icon-scale="1" @back="enableMenu('setting')">
        <texml-setting></texml-setting>
      </settings-section>
      <settings-section v-if="activeMenu == 'sip'" title="SIP Setting" title-tag="h6" :icon-scale="1" @back="enableMenu('setting')">
        <sip-setting></sip-setting>
      </settings-section>
    </div>
</template>

<script>
import SipSetting from './SipSetting.vue'
import TexmlSetting from './TexmlSetting.vue'
import MessageSetting from './MessageSetting.vue'
import SettingsSection from '../../SettingsSection.vue'

export default {
  components: { SipSetting, TexmlSetting, MessageSetting, SettingsSection },
  data () {
    return {
      activeMenu: 'setting'
    }
  },
  methods: {
    enableMenu (menu) {
      this.activeMenu = menu
    }
  }
}
</script>
