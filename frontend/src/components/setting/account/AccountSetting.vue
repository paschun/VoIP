<template>
  <div class="p-2">
    <div v-if="activeMenu == 'setting'">
      <ul class="list-group">
        <li class="list-group-item" @click="enableMenu('username')" style="cursor: pointer"><i-bi-person aria-hidden="true" class="mx-2" />Change Username</li>
        <li class="list-group-item" @click="enableMenu('password')" style="cursor: pointer"><i-bi-key aria-hidden="true" class="mx-2" />Change Password</li>
        <li class="list-group-item" @click="deleteAccount()" style="cursor: pointer"><i-bi-trash aria-hidden="true" class="mx-2" />Delete Account</li>
        <li class="list-group-item" @click="enableMenu('fallback')" style="cursor: pointer">
          <i-bi-exclamation-circle aria-hidden="true" class="mx-2" />Fallback Setting
        </li>
      </ul>
    </div>
    <settings-section v-if="activeMenu == 'username'" title="Change Username" title-tag="h6" :icon-scale="1" @back="enableMenu('setting')">
      <change-username></change-username>
    </settings-section>
    <settings-section v-if="activeMenu == 'password'" title="Change Password" title-tag="h6" :icon-scale="1" @back="enableMenu('setting')">
      <change-password></change-password>
    </settings-section>
    <settings-section v-if="activeMenu == 'fallback'" title="Fallback Setting" title-tag="h6" :icon-scale="1" @back="enableMenu('setting')">
      <call-setting></call-setting>
    </settings-section>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { client, request } from '@/core/rpc.client.ts'
import { appDirectory } from '@/router/helpers.ts'
import { useUserStore } from '@/stores/user.ts'
import CallSetting from '../CallSetting.vue'
import SettingsSection from '../SettingsSection.vue'
import ChangePassword from './ChangePassword.vue'
import ChangeUsername from './ChangeUsername.vue'

export default defineComponent({
  components: { ChangeUsername, ChangePassword, CallSetting, SettingsSection },
  setup() {
    return { userStore: useUserStore() }
  },
  data() {
    return {
      activeMenu: 'setting',
    }
  },
  methods: {
    enableMenu(menu: string) {
      this.activeMenu = menu
    },
    async deleteAccount() {
      const result = await this.$swal.fire({
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
        allowOutsideClick: () => !this.$swal.isLoading(),
      })
      // request() already toasted on failure; preConfirm returns false then, so gate on the value (a failed delete must
      // not fall through to the success swal + logout).
      if (!result.value) return
      await this.$swal.fire({
        icon: 'success',
        title: 'Account Delete',
        text: `Your account deleted successfully`,
        showDenyButton: false,
        showCancelButton: false,
        confirmButtonText: 'Ok',
      })
      this.userStore.logout()
      window.location.href = `/${appDirectory(this.$route)}/`
    },
  },
})
</script>
