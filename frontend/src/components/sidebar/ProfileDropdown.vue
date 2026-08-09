<template>
  <BDropdown class="drop-down" variant="primary">
    <template #button-content>
      <div class="d-flex flex-row align-items-center">
        <div class="profile-text">
          <template v-if="profileStore.activeProfile">
            <div class="profile-name">{{ profileStore.activeProfile.profile }}</div>
            <div class="profile-num">{{ profileStore.activeProfile.number }}</div>
          </template>
          <span v-else-if="userStore.userData">{{ userStore.userData.name }}</span>
        </div>
        <div>
          <IBiPersonBadge aria-hidden="true" class="mx-2 my-auto" title="Profiles" />
        </div>
        <span v-if="activeTotalCount > 0" class="position-absolute top-0 start-100 translate-middle badge border border-light rounded-circle bg-danger p-2"
          ><span class="visually-hidden">unread messages</span></span
        >
        <div class="dropdownAdd"></div>
      </div>
    </template>
    <BDropdownDivider></BDropdownDivider>
    <LoadingSpinner :show="profileStore.profileIsLoading" />
    <div v-for="profile in profileStore.profiles" :key="profile._id">
      <BDropdownItemButton @click="profileStore.setActiveProfile(profile)">
        <div class="d-flex flex-row">
          <div>
            <div class="d-flex flex-column">
              <div class="profile-label">
                {{ profile.profile }}
              </div>
              <div>
                <span v-if="profile.number && profile.number !== ''" class="profile-num">({{ profile.number }})</span>
              </div>
            </div>
          </div>
          <div>
            <span v-if="(profile.messageCount ?? 0) > 0" class="start-100 translate-middle badge border border-light rounded-circle bg-danger p-2"
              ><span class="visually-hidden">unread messages</span></span
            >
          </div>
        </div>
      </BDropdownItemButton>
      <BDropdownDivider></BDropdownDivider>
    </div>
    <BDropdownItemButton v-b-modal.add-profile>
      <IBiPersonPlusFill aria-hidden="true" />
      Add New Profile
    </BDropdownItemButton>
    <BDropdownDivider></BDropdownDivider>
    <BModal id="add-profile" ref="add-profile" size="lg" title="Add Profile" no-footer>
      <span class="small text-secondary">Profile</span>
      <form class="ml-2 mr-2" @submit.prevent="addProfile">
        <div class="form-group mt-2">
          <input v-model="r$.$value" class="form-control rounded-input" placeholder="Enter Profile" :class="{ 'is-invalid': r$.$error }">
          <div v-if="r$.$error" class="invalid-feedback">
            <span v-for="error of r$.$errors" :key="error">{{ error }}</span>
          </div>
        </div>
        <div class="d-grid d-md-flex mt-3">
          <button class="btn btn-primary" type="submit" :disabled="!r$.$correct">Save</button>
        </div>
      </form>
    </BModal>
    <BDropdownItemButton @click="logout()">
      <IBiPower aria-hidden="true" />
      Logout
    </BDropdownItemButton>
  </BDropdown>
</template>

<script setup lang="ts">
/** The header profile dropdown: active-profile display + unread badge, profile selector, add-profile modal, logout.
 * The add-profile modal opens by id via `v-b-modal.add-profile`, so it stays template-ref imperative for `hide()`.
 * This component uses <BDropdown> which uses floating-ui, justifying the floating-ui types installed as devdep
 */
import { computed, onMounted, useTemplateRef } from 'vue'
import { useRegle } from '@regle/core'
import { required, withMessage } from '@regle/rules'
import type { BModal } from 'bootstrap-vue-next'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'
import { useActiveProfileChange } from '@/composables/useActiveProfileChange.ts'
import { setServerErrors } from '@/core/handle-error.ts'
import { notifySuccess } from '@/core/notify.ts'
import { useProfileStore } from '@/stores/profile.ts'
import { useUserStore } from '@/stores/user.ts'

const profileStore = useProfileStore()
const userStore = useUserStore()
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
    void notifySuccess('Profile added successfully!')
    void addProfileModal.value?.hide() // ?. covers the null before mount
    r$.$reset({ toState: '' })
  } catch (err) {
    // 409 "Profile already exists!"
    setServerErrors(r$, err, (message) => [message])
    throw err
  }
}

async function logout() {
  await userStore.logout() // clears the session; the router watches the token and bounces off the protected route.
}

onMounted(() => {
  void profileStore.initSelection()
})
// Selection changed: pull the new profile's detail (unread counts).
useActiveProfileChange(() => profileStore.refreshActiveProfile())
</script>

<style scoped>
/* Plain rules, not `d-flex`: Bootstrap's utilities are `!important` and would beat the query below. */
.profile-text {
  display: flex;
  flex-direction: column;
}

/* The header row needs ~360px with this text and ~260px without, so drop it when the sidebar is too narrow. Only the
   panel width matters, not the viewport: the drawer is a fixed 400px however wide the phone is. */
@container sidebar-header (width < 360px) {
  .profile-text {
    display: none;
  }
}

/* The toggle keeps an explicit fill so it stays filled on hover; the menu and its items theme natively through
   Bootstrap's own --bs-dropdown-* tokens. :deep targets BootstrapVueNext elements. */
.drop-down,
.drop-down :deep(.dropdown-toggle) {
  background-color: var(--background-color-secondary);
  border-color: var(--background-color-secondary);
  color: var(--text-primary-color);
}
.drop-down :deep(.dropdown-toggle) {
  padding: 0 0.75rem;
  font-size: 15px;
}
.drop-down :deep(.dropdown-toggle::after) {
  display: none;
}
.drop-down :deep(.dropdown-menu) {
  --bs-dropdown-bg: var(--background-color-secondary);
  --bs-dropdown-border-color: var(--background-color-secondary);
  --bs-dropdown-color: var(--text-primary-color);
  --bs-dropdown-link-color: var(--text-primary-color);
  --bs-dropdown-link-hover-color: var(--text-primary-color);
  --bs-dropdown-link-hover-bg: var(--contact-hover);
  --bs-dropdown-box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
  max-height: 100vh;
  overflow-y: auto;
}
.drop-down :deep(.dropdown-item) {
  line-height: 18px;
}

/* A long profile name truncates instead of widening the toggle or the menu. */
.profile-name,
.profile-label {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  max-width: 250px;
}
.profile-name {
  max-width: 100px;
}
.profile-num {
  font-size: 12px;
  color: var(--theme-orange);
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
