<template>
    <div class="p-2">
      <div v-if="activeMenu == 'setting'">
        <ul class="list-group">
          <li class="list-group-item" @click="enableMenu('twiml')" style="cursor: pointer">
            <b-icon icon="gear-fill" font-scale="1" aria-hidden="true" class="mx-2"></b-icon>TwiML Setting
          </li>
          <li class="list-group-item" @click="enableMenu('number')" style="cursor: pointer">
            <b-icon icon="telephone" font-scale="1" aria-hidden="true" class="mx-2"></b-icon>Number Setting
          </li>
        </ul>
      </div>
      <settings-section v-if="activeMenu == 'twiml'" title="TwiML Setting" title-tag="h6" :icon-scale="1" @back="enableMenu('setting')">
        <twiml-setting></twiml-setting>
      </settings-section>
      <settings-section v-if="activeMenu == 'number'" title="Number Setting" title-tag="h6" :icon-scale="1" @back="enableMenu('setting')">
        <twilio-number-setting></twilio-number-setting>
      </settings-section>
    </div>
</template>

<script>
import TwilioNumberSetting from './TwilioNumberSetting.vue'
import TwimlSetting from './TwimlSetting.vue'
import SettingsSection from '../../SettingsSection.vue'

export default {
  components: { TwilioNumberSetting, TwimlSetting, SettingsSection },
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
