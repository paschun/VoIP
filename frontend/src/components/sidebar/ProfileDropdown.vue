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
            <input class="form-control chat-input" v-model="r$.$value" placeholder="Enter Profile" :class="{ 'is-invalid': r$.$error }" >
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

<script setup lang="ts">
/** The header profile dropdown: active-profile display + unread badge, profile selector, add-profile modal, logout.
 * The add-profile modal opens by id via `v-b-modal.add-profile`, so it stays template-ref imperative for `hide()`. */
import { computed, onMounted, useTemplateRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useRegle } from '@regle/core'
import { required, withMessage } from '@regle/rules'
import type { BModal } from 'bootstrap-vue-next'
import { DetailedError } from 'hono/client'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'
import { notifySuccess } from '@/core/notify.ts'
import { useProfileStore } from '@/stores/profile.ts'
import { useUserStore } from '@/stores/user.ts'

const profileStore = useProfileStore()
const userStore = useUserStore()
const router = useRouter()
const { r$ } = useRegle('', {
  required: withMessage(required, 'Profile is required'), // default: This field is required
})
const addProfileModal = useTemplateRef<InstanceType<typeof BModal>>('add-profile')

// `totalCount` is a populated virtual present only on the detail (getOne/list) variant, not the create/delete one.
const activeTotalCount = computed(() => {
  const p = profileStore.activeProfile
  return p && 'totalCount' in p ? (p.totalCount ?? 0) : 0
})

async function addProfile() {
  const { valid, data } = await r$.$validate()
  if (!valid) return
  try {
    await profileStore.createProfile(data) // loading state will also be `true` for subsequent loadProfiles
    notifySuccess('Profile added successfully!')
    addProfileModal.value?.hide() // ?. covers the null before mount
    r$.$reset({ toState: '' })
  } catch (err) {
    // 409 "Profile already exists!"
    if (err instanceof DetailedError) {
      r$.$setExternalErrors([err.detail?.data?.message])
    }
    throw err
  }
}

function logout() {
  userStore.logout()
  router.push({ name: 'login' })
}

onMounted(() => {
  void profileStore.initSelection()
})
// Selection changed: pull the new profile's detail (unread counts). Gating on the id avoids a refetch loop,
// since refreshActiveProfile reassigns a same-id object. immediate so a profile persisted in localStorage
// loads on mount -- its id doesn't "change".
watch(() => profileStore.activeProfileId, () => void profileStore.refreshActiveProfile(), { immediate: true })
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
