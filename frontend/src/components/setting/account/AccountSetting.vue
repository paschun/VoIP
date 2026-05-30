<template>
    <div class="p-2">
      <div v-if="activeMenu == 'setting'">
        <ul class="list-group">
          <li class="list-group-item" @click="enableMenu('username')" style="cursor: pointer">
            <b-icon icon="person" font-scale="1" aria-hidden="true" class="mx-2"></b-icon>Change Username
          </li>
          <li class="list-group-item" @click="enableMenu('password')" style="cursor: pointer">
            <b-icon icon="key" font-scale="1" aria-hidden="true" class="mx-2"></b-icon>Change Password
          </li>
          <li class="list-group-item" @click="deleteAccount()" style="cursor: pointer">
            <b-icon icon="trash" font-scale="1" aria-hidden="true" class="mx-2"></b-icon>Delete Account
          </li>
          <li class="list-group-item" @click="enableMenu('fallback')" style="cursor: pointer">
            <b-icon icon="exclamation-circle" font-scale="1" aria-hidden="true" class="mx-2"></b-icon>Fallback Setting
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

<script>
import ChangeUsername from './ChangeUsername.vue'
import ChangePassword from './ChangePassword.vue'
import CallSetting from '../CallSetting.vue'
import SettingsSection from '../SettingsSection.vue'

export default {
  components: { ChangeUsername, ChangePassword, CallSetting, SettingsSection },
  data () {
    return {
      activeMenu: 'setting'
    }
  },
  methods: {
    enableMenu (menu) {
      this.activeMenu = menu
    },
    async deleteAccount () {
      const result = await this.$swal.fire({
        icon: 'warning',
        text: 'Please enter your account password to delete account. This process is irreversible',
        title: 'Delete Account',
        input: 'password',
        inputAttributes: {
          autocapitalize: 'off'
        },
        showCancelButton: true,
        confirmButtonText: 'Submit',
        showLoaderOnConfirm: true,
        preConfirm: (login) => {
          return this.$post('auth/password/check', { password: login })
            .catch(() => false)
        },
        allowOutsideClick: () => !this.$swal.isLoading()
      })
      if (!result.isConfirmed) return
      await this.$swal.fire({
        icon: 'success',
        title: 'Account Delete',
        text: `Your account deleted successfully`,
        showDenyButton: false,
        showCancelButton: false,
        confirmButtonText: 'Ok'
      })
      this.$cookie.delete('access_token')
      this.$cookie.delete('userdata')
      window.location.href = `/${this.$route.params.appdirectory}/`
    }
  }
}
</script>
