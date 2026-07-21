<template>
  <!-- Pure panel: opened by the sidebar's gear icon via v-b-toggle.sidebar-settings -->
  <div>
    <BOffcanvas id="sidebar-settings" title="Settings" backdrop>
      <div v-if="activeMenu === 'setting'" class="px-3 py-2">
        <ul class="list-group">
          <li class="list-group-item cursor-pointer" @click="enableMenu('email')"><IBiEnvelope aria-hidden="true" class="mx-2" />Email Settings</li>
          <li class="list-group-item cursor-pointer" @click="providerSettingModal?.open()">
            <IBiPersonBadge aria-hidden="true" class="mx-2" />Profile Settings
          </li>
          <li class="list-group-item cursor-pointer" @click="enableMenu('account')">
            <IBiPerson aria-hidden="true" class="mx-2" />Account Settings
          </li>
          <li class="list-group-item cursor-pointer" @click="passwordEnable('mfa')">
            <IBiShieldLock aria-hidden="true" class="mx-2" />MFA Settings
          </li>
        </ul>
        <div class="version">{{ meta.version }}</div>
      </div>
      <SettingsSection v-if="activeMenu === 'email'" title="Email Settings" @back="enableMenu('setting')">
        <EmailSetting></EmailSetting>
      </SettingsSection>

      <SettingsSection v-if="activeMenu === 'account'" title="Account Settings" @back="enableMenu('setting')">
        <AccountSetting></AccountSetting>
      </SettingsSection>

      <SettingsSection v-if="activeMenu === 'mfa'" title="MFA Settings" @back="enableMenu('setting')">
        <MfaSetting />
      </SettingsSection>

      <SettingsSection v-if="activeMenu === 'password'" title="Password Verification" @back="enableMenu('setting')">
        <div class="m-2">
          <div class="form-group">
            <label>Password</label>
            <input v-model="passwordInput" type="password" class="form-control" placeholder="Enter Password" @keyup.enter="checkPassword()">
          </div>
          <div class="text-center">
            <button class="btn btn-success my-2 px-4" @click="checkPassword()">Verify</button>
          </div>
        </div>
      </SettingsSection>
    </BOffcanvas>
    <ProviderSettingModal ref="providerSettingModal" />
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
import MfaSetting from './security/MfaSetting.vue'
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
#sidebar-settings .offcanvas-header,
#sidebar-settings .offcanvas-body {
  background-color: var(--contact-list);
  color: var(--text-primary-color);
}
/* offcanvas .btn-close has svg background with fill='#000' hardcoded */
</style>
