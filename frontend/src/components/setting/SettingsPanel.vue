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
            <input type="password" class="form-control" v-model="passwordInput" placeholder="Enter Password" @keyup.enter="checkPassword()">
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

<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import { client, request } from '@/core/rpc.client.ts'
import { notifyError } from '@/core/notify.ts'
import { useServerMetaStore } from '@/stores/server-meta.ts'
import AccountSetting from './account/AccountSetting.vue'
import EmailSetting from './EmailSetting.vue'
import ProviderSettingModal from './ProviderSettingModal.vue'
import Mfa from './security/Mfa.vue'
import SettingsSection from './SettingsSection.vue'

const meta = useServerMetaStore()
const providerSettingModal = useTemplateRef<InstanceType<typeof ProviderSettingModal>>('providerSettingModal')

const activeMenu = ref('setting')
const checkPasswordMenu = ref('')
const passwordInput = ref('')

function enableMenu(menu: string) {
  activeMenu.value = menu
}
function passwordEnable(menu: string) {
  checkPasswordMenu.value = menu
  enableMenu('password')
}
async function checkPassword() {
  if (passwordInput.value === '') {
    void notifyError('please enter password')
    return
  }
  await request(client.api.auth.password.verify.$post({ json: { password: passwordInput.value } }))
  passwordInput.value = ''
  enableMenu(checkPasswordMenu.value)
}
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
