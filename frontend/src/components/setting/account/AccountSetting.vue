<template>
  <div class="p-2">
    <div v-if="activeMenu === 'setting'">
      <ul class="list-group">
        <li class="list-group-item cursor-pointer" @click="enableMenu('username')"><IBiPerson aria-hidden="true" class="mx-2" />Change Username</li>
        <li class="list-group-item cursor-pointer" @click="enableMenu('password')"><IBiKey aria-hidden="true" class="mx-2" />Change Password</li>
        <li class="list-group-item cursor-pointer" @click="deleteAccount()"><IBiTrash aria-hidden="true" class="mx-2" />Delete Account</li>
        <li class="list-group-item cursor-pointer" @click="enableMenu('fallback')">
          <IBiExclamationCircle aria-hidden="true" class="mx-2" />Fallback Setting
        </li>
      </ul>
    </div>
    <SettingsSection v-if="activeMenu === 'username'" title="Change Username" title-tag="h6" :icon-scale="1" @back="enableMenu('setting')">
      <ChangeUsername></ChangeUsername>
    </SettingsSection>
    <SettingsSection v-if="activeMenu === 'password'" title="Change Password" title-tag="h6" :icon-scale="1" @back="enableMenu('setting')">
      <ChangePassword></ChangePassword>
    </SettingsSection>
    <!-- TODO: provider webhook fallback settings arguably belong under the profile/provider settings UI, not Account Settings. -->
    <SettingsSection v-if="activeMenu === 'fallback'" title="Fallback Setting" title-tag="h6" :icon-scale="1" @back="enableMenu('setting')">
      <FallbackSetting></FallbackSetting>
    </SettingsSection>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Swal from 'sweetalert2'
import { client, request } from '@/core/rpc.client.ts'
import { useUserStore } from '@/stores/user.ts'
import FallbackSetting from '../fallback/FallbackSetting.vue'
import SettingsSection from '../SettingsSection.vue'
import ChangePassword from './ChangePassword.vue'
import ChangeUsername from './ChangeUsername.vue'

const userStore = useUserStore()
const activeMenu = ref('setting')

function enableMenu(menu: string) {
  activeMenu.value = menu
}

async function deleteAccount() {
  const result = await Swal.fire({
    icon: 'warning',
    text: 'Please enter your account password to delete account. This process is irreversible',
    title: 'Delete Account',
    input: 'password',
    inputAttributes: {
      autocapitalize: 'off',
    },
    showCancelButton: true,
    confirmButtonText: 'Submit',
    showLoaderOnConfirm: true,
    preConfirm: async (login) => {
      try {
        await request(client.api.auth.account.$delete({ json: { password: login } }))
        return true
      } catch {
        return false
      }
    },
    allowOutsideClick: () => !Swal.isLoading(),
  })
  // request() already toasted on failure; preConfirm returns false then, so gate on the value (a failed delete must
  // not fall through to the success swal + logout).
  if (!result.value) return
  await Swal.fire({
    icon: 'success',
    title: 'Account Delete',
    text: `Your account deleted successfully`,
    showDenyButton: false,
    showCancelButton: false,
    confirmButtonText: 'Ok',
  })
  // No redirect here: clearing the session trips the Dashboard's auth watcher, which bounces to login.
  await userStore.logout()
}
</script>
