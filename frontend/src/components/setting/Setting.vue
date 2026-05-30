<template>
  <div>
      <b-icon font-scale="1" icon="gear-fill" aria-hidden="true" class="m-2" title="Settings" style="cursor:pointer;" v-b-toggle.sidebar-email-setting></b-icon>
      <b-sidebar id="sidebar-email-setting" title="Settings" shadow backdrop>
          <div class="px-3 py-2" v-if="activeMenu == 'setting'">
            <ul class="list-group">
              <li class="list-group-item" @click="enableMenu('email')" style="cursor: pointer">
                <b-icon icon="envelope" font-scale="1" aria-hidden="true" class="mx-2"></b-icon>Email Settings</li>
              <li class="list-group-item" v-b-modal.modal-1 style="cursor: pointer">
                <b-icon icon="person-badge" font-scale="1" aria-hidden="true" class="mx-2"></b-icon>Profile Settings
              </li>
              <li class="list-group-item" @click="enableMenu('account')" style="cursor: pointer">
                <b-icon icon="person" font-scale="1" aria-hidden="true" class="mx-2"></b-icon>Account Settings
              </li>
              <li class="list-group-item" @click="passwordEnable('mfa')" style="cursor: pointer">
                <b-icon icon="shield-lock" font-scale="1" aria-hidden="true" class="mx-2"></b-icon>MFA Settings
              </li>
            </ul>
            <div class="version">{{ versionOption }}</div>
          </div>
          <settings-section v-if="activeMenu == 'email'" title="Email Settings" @back="enableMenu('setting')">
            <email-setting></email-setting>
          </settings-section>

          <settings-section v-if="activeMenu == 'call'" title="Call Settings" @back="enableMenu('setting')">
            <call-setting></call-setting>
          </settings-section>

          <settings-section v-if="activeMenu == 'profile'" title="Profile Settings" @back="enableMenu('setting')">
            Profile settings
          </settings-section>

          <settings-section v-if="activeMenu == 'account'" title="Account Settings" @back="enableMenu('setting')">
            <account-setting></account-setting>
          </settings-section>

          <settings-section v-if="activeMenu == 'mfa'" title="MFA Settings" @back="enableMenu('setting')">
            <mfa />
          </settings-section>

          <settings-section v-if="activeMenu == 'password'" title="Password Verification" @back="enableMenu('setting')">
            <div  class="m-2">
              <div class="form-group">
                <label>Password</label>
                <input type="password" class="form-control" v-model="check_password" placeholder="Enter Password" @keyup.enter="checkPassword()">
              </div>
              <div class="text-center">
              <button class="btn btn-success my-2 px-4" @click="checkPassword()">Verify</button>
              </div>
            </div>
          </settings-section>
      </b-sidebar>
  </div>
</template>
<script>
import EmailSetting from './EmailSetting.vue'
import CallSetting from './CallSetting.vue'
import AccountSetting from './account/AccountSetting.vue'
import Mfa from './security/Mfa.vue'
import SettingsSection from './SettingsSection.vue'
import { notifyError } from '@/notify'

export default {
components: { EmailSetting, CallSetting, AccountSetting, Mfa, SettingsSection },
data () {
  return {
    activeMenu: 'setting',
    versionOption: 'v0',
    checkpasswordMenu: '',
    check_password: ''
  }
},
mounted () {
  this.getVersion()
},
methods: {
  enableMenu (menu) {
    this.activeMenu = menu
  },
  async getVersion() {
    const res = await this.$get("auth/get-version")
    if (res?.status) this.versionOption = res.data
  },
  passwordEnable (menu) {
    this.checkpasswordMenu = menu
    this.enableMenu('password')
  },
  checkPassword () {
    if (this.check_password === '') {
      notifyError('please enter password')
      return
    }
    this.$post('auth/password/verify', { password: this.check_password })
      .then((response) => {
        if (response) {
          this.check_password = ''
          this.enableMenu(this.checkpasswordMenu)
        }
      })
      .catch(() => {})
  }
}
}
</script>
