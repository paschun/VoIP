<template>
  <div class="icons mt-2">
    <b-dropdown class="dropDown" variant="primary">
      <template #button-content>
        <div class="d-flex flex-row align-items-center bd-highlight">
          <div v-if="profileStore.activeProfile" class="d-flex flex-column bd-highlight">
            <div class="profileName">{{ profileStore.activeProfile.profile }}</div>
            <div class="profileNum">{{ profileStore.activeProfile.number }}</div>
            <span
              v-if="activeTotalCount > 0"
              class="position-absolute top-0 start-100 translate-middle badge border border-light rounded-circle bg-danger p-2"
              ><span class="visually-hidden">unread messages</span></span
            >
          </div>
          <div v-else>
            <span v-if="userStore.userData">{{ userStore.userData.name }}</span>
          </div>
          <div>
            <i-bi-person-badge aria-hidden="true" class="mx-2 my-auto" title="Profiles" />
          </div>
          <div class="dropdownAdd"></div>
        </div>
      </template>
      <b-dropdown-divider></b-dropdown-divider>
      <profile-view />
      <b-dropdown-item-button @click="logout()">
        <i-bi-power aria-hidden="true" />
        Logout
      </b-dropdown-item-button>
    </b-dropdown>
  </div>
</template>

<script lang="ts">
/** The header profile dropdown: active-profile display + unread badge, the profile selector (ProfileView), and logout. */
import { defineComponent } from 'vue'
import ProfileView from '@/components/setting/ProfileView.vue'
import { appDirectory } from '@/router/helpers.ts'
import { useProfileStore } from '@/stores/profile.ts'
import { useUserStore } from '@/stores/user.ts'

export default defineComponent({
  name: 'ProfileDropdown',
  components: { ProfileView },
  setup() {
    return {
      profileStore: useProfileStore(),
      userStore: useUserStore(),
    }
  },
  computed: {
    // `totalCount` is a populated virtual present only on the detail (getOne/list) variant, not the create/delete one.
    activeTotalCount(): number {
      const p = this.profileStore.activeProfile
      return p && 'totalCount' in p ? (p.totalCount ?? 0) : 0
    },
  },
  watch: {
    // Selection changed: pull the new profile's detail (unread counts). Gating on the id avoids a refetch loop,
    // since refreshActiveProfile reassigns a same-id object. immediate so a profile persisted in localStorage
    // loads on mount -- its id doesn't "change".
    'profileStore.activeProfileId': {
      immediate: true,
      handler() {
        void this.profileStore.refreshActiveProfile()
      },
    },
  },
  methods: {
    logout() {
      this.userStore.logout()
      this.$router.push({ name: 'login', params: { appdirectory: appDirectory(this.$route) } })
    },
  },
})
</script>

<style scoped>
.icons {
  font-size: 30px;
}
.dropdownAdd {
  margin-left: 0.255em;
  vertical-align: 0.255em;
  border-top: 0.3em solid;
  border-right: 0.3em solid transparent;
  border-bottom: 0;
  border-left: 0.3em solid transparent;
}
</style>
