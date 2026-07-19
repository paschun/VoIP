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
      <loading-spinner :show="profileStore.profileIsLoading" />
      <div v-for="profile in profileStore.profiles" :key="profile._id">
        <b-dropdown-item-button @click="profileStore.setActiveProfile(profile)">
          <div class="d-flex flex-row">
            <div>
              <div class="d-flex flex-column">
                <div>
                  {{ profile.profile }}
                </div>
                <div>
                  <span v-if="profile.number && profile.number !== ''" class="profileNum">({{ profile.number }})</span>
                </div>
              </div>
            </div>
            <div>
              <span v-if="(profile.messageCount ?? 0) > 0" class="start-100 translate-middle badge border border-light rounded-circle bg-danger p-2"
                ><span class="visually-hidden">unread messages</span></span
              >
            </div>
          </div>
        </b-dropdown-item-button>
        <b-dropdown-divider></b-dropdown-divider>
      </div>
      <b-dropdown-item-button v-b-modal.add-profile>
        <i-bi-person-plus-fill aria-hidden="true" />
        Add New Profile
      </b-dropdown-item-button>
      <b-dropdown-divider></b-dropdown-divider>
      <b-modal ref="add-profile" id="add-profile" size="lg" title="Add Profile" no-footer>
        <span class="small text-secondary">Profile</span>
        <form @submit.prevent="addProfile" class="ml-2 mr-2">
          <div class="form-group mt-2">
            <input class="form-control chat-input" v-model="r$.$value" placeholder="Enter Profile" :class="{ 'is-invalid': r$.$error }" />
            <div v-if="r$.$error" class="invalid-feedback">
              <span v-for="error of r$.$errors" :key="error">{{ error }}</span>
            </div>
          </div>
          <div class="d-grid d-md-flex mt-3">
            <button class="btn btn-primary" type="submit" :disabled="!r$.$correct">Save</button>
          </div>
        </form>
      </b-modal>
      <b-dropdown-item-button @click="logout()">
        <i-bi-power aria-hidden="true" />
        Logout
      </b-dropdown-item-button>
    </b-dropdown>
  </div>
</template>

<script lang="ts">
/** The header profile dropdown: active-profile display + unread badge, profile selector, add-profile modal, logout. */
import { defineComponent, useTemplateRef } from 'vue'
import { useRegle } from '@regle/core'
import { required, withMessage } from '@regle/rules'
import type { BModal } from 'bootstrap-vue-next'
import { DetailedError } from 'hono/client'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'
import { notifySuccess } from '@/core/notify.ts'
import { useProfileStore } from '@/stores/profile.ts'
import { useUserStore } from '@/stores/user.ts'

export default defineComponent({
  name: 'ProfileDropdown',
  components: { LoadingSpinner },
  setup() {
    const { r$ } = useRegle('', {
      required: withMessage(required, 'Profile is required'), // default: This field is required
    })
    // type inference on useTemplateRef works with composition API `<script setup> + Volar`
    const addProfileModal = useTemplateRef<InstanceType<typeof BModal>>('add-profile')
    return {
      r$,
      addProfileModal,
      profileStore: useProfileStore(),
      userStore: useUserStore(),
    }
  },
  mounted() {
    void this.profileStore.initSelection()
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
    async addProfile() {
      const { valid, data } = await this.r$.$validate()
      if (!valid) return
      try {
        await this.profileStore.createProfile(data) // loading state will also be `true` for subsequent loadProfiles
        notifySuccess('Profile added successfully!')
        this.addProfileModal?.hide() // ?. covers the null before mount
        this.r$.$reset({ toState: '' })
      } catch (err) {
        // 409 "Profile already exists!"
        if (err instanceof DetailedError) {
          this.r$.$setExternalErrors([err.detail?.data?.message])
        }
        throw err
      }
    },
    logout() {
      this.userStore.logout()
      this.$router.push({ name: 'login' })
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
