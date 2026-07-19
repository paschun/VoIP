<template>
  <!-- Pure panel: opened by the sidebar's gear icon via v-b-toggle.sidebar-email-setting -->
  <div>
    <b-offcanvas id="sidebar-email-setting" title="Settings" backdrop>
      <div class="px-3 py-2" v-if="activeMenu == 'setting'">
        <ul class="list-group">
          <li class="list-group-item" @click="enableMenu('email')" style="cursor: pointer"><i-bi-envelope aria-hidden="true" class="mx-2" />Email Settings</li>
          <li class="list-group-item" @click="providerSettingModal?.open()" style="cursor: pointer">
            <i-bi-person-badge aria-hidden="true" class="mx-2" />Profile Settings
          </li>
          <li class="list-group-item" @click="enableMenu('account')" style="cursor: pointer">
            <i-bi-person aria-hidden="true" class="mx-2" />Account Settings
          </li>
          <li class="list-group-item" @click="passwordEnable('mfa')" style="cursor: pointer">
            <i-bi-shield-lock aria-hidden="true" class="mx-2" />MFA Settings
          </li>
        </ul>
        <div class="version">{{ meta.version }}</div>
      </div>
      <settings-section v-if="activeMenu == 'email'" title="Email Settings" @back="enableMenu('setting')">
        <email-setting></email-setting>
      </settings-section>

      <settings-section v-if="activeMenu == 'account'" title="Account Settings" @back="enableMenu('setting')">
        <account-setting></account-setting>
      </settings-section>

      <settings-section v-if="activeMenu == 'mfa'" title="MFA Settings" @back="enableMenu('setting')">
        <mfa />
      </settings-section>

      <settings-section v-if="activeMenu == 'password'" title="Password Verification" @back="enableMenu('setting')">
        <div class="m-2">
          <div class="form-group">
            <label>Password</label>
            <input type="password" class="form-control" v-model="check_password" placeholder="Enter Password" @keyup.enter="checkPassword()" />
          </div>
          <div class="text-center">
            <button class="btn btn-success my-2 px-4" @click="checkPassword()">Verify</button>
          </div>
        </div>
      </settings-section>
    </b-offcanvas>
    <provider-setting-modal ref="providerSettingModal" />
  </div>
</template>
<script lang="ts">
import { defineComponent, useTemplateRef } from 'vue'
import { client, request } from '@/core/rpc.client.ts'
import { notifyError } from '@/core/notify.ts'
import { useServerMetaStore } from '@/stores/server-meta.ts'
import AccountSetting from './account/AccountSetting.vue'
import EmailSetting from './EmailSetting.vue'
import ProviderSettingModal from './ProviderSettingModal.vue'
import Mfa from './security/Mfa.vue'
import SettingsSection from './SettingsSection.vue'

export default defineComponent({
  name: 'SettingsPanel',
  components: { EmailSetting, AccountSetting, Mfa, SettingsSection, ProviderSettingModal },
  setup() {
    const providerSettingModal = useTemplateRef<InstanceType<typeof ProviderSettingModal>>('providerSettingModal')
    return { meta: useServerMetaStore(), providerSettingModal }
  },
  data() {
    return {
      activeMenu: 'setting',
      checkPasswordMenu: '',
      check_password: '',
    }
  },
  methods: {
    enableMenu(menu: string) {
      this.activeMenu = menu
    },
    passwordEnable(menu: string) {
      this.checkPasswordMenu = menu
      this.enableMenu('password')
    },
    async checkPassword() {
      if (this.check_password === '') {
        notifyError('please enter password')
        return
      }
      await request(client.api.auth.password.verify.$post({ json: { password: this.check_password } }))
      this.check_password = ''
      this.enableMenu(this.checkPasswordMenu)
    },
  },
})
</script>

<!-- BOffcanvas is teleported, so these rules target its rendered internals globally rather than scoped. -->
<style>
#sidebar-email-setting .offcanvas-header,
#sidebar-email-setting .offcanvas-body {
  background-color: var(--contact-list);
  color: var(--text-primary-color);
}
/* offcanvas .btn-close has svg background with fill='#000' hardcoded */
</style>
