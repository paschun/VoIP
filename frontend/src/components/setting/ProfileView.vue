<template>
  <div>
    <loading-spinner :show="profileStore.profileIsLoading" />
    <div v-for="profile in profileStore.profiles" :key="profile._id" >
      <b-dropdown-item-button @click="changeProfile(profile)">
        <div class="d-flex flex-row">
          <div>
            <div class="d-flex flex-column">
              <div>
                {{ profile.profile }}
              </div>
              <div>
                <span v-if="profile.number && profile.number !== ''" class="profileNum">({{profile.number}})</span>
              </div>
            </div>
          </div>
          <div>
            <span v-if="(profile.messageCount ?? 0) > 0" class="start-100 translate-middle badge border border-light rounded-circle bg-danger p-2"><span class="visually-hidden">unread messages</span></span>
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
  </div>
</template>

<script lang="ts">
/**
 * Profile data goes through the profile store / profileService (no direct
 * $post here): loadProfiles -> profile/getdata, createProfile -> profile/create.
 */
import { defineComponent, useTemplateRef } from 'vue'
import type { BModal } from 'bootstrap-vue-next'
import { useRegle } from '@regle/core'
import { DetailedError } from 'hono/client'
import { required, withMessage } from '@regle/rules'
import { notifySuccess } from '@/notify.ts'
import { useProfileStore } from '@/stores/profile.ts'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

export default defineComponent({
  components: { LoadingSpinner },
  setup () {
    const { r$ } = useRegle('', {
      required: withMessage(required, 'Profile is required') // default: This field is required
    })
    // type inference on useTemplateRef works with composition API `<script setup> + Volar`
    const addProfileModal = useTemplateRef<InstanceType<typeof BModal>>('add-profile')
    return { r$, profileStore: useProfileStore(), addProfileModal }
  },
  mounted () {
    this.initSelection()
  },
  methods: {
    changeProfile (profile: any) {
      this.profileStore.setActiveProfile(profile)
    },
    activeFirstProfile () {
      const profiles = this.profileStore.profiles
      if (profiles.length > 0) {
        this.changeProfile(profiles[0])
      }
    },
    /**
     * Load the list and select once (stored profile, else the first), firing the profile-changed watchers. Used on
     * mount + after create/delete.
     */
    async initSelection () {
      const list = await this.profileStore.loadProfiles()
      const selected = this.profileStore.resolveActiveProfile(list)
      if (selected) this.changeProfile(selected)
    },
    /** List/badge refresh only (no re-selection) for pull-to-refresh / new message. */
    getAllProfiles () {
      void this.profileStore.loadProfiles()
    },
    async addProfile () {
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
    }
  }
})
</script>
