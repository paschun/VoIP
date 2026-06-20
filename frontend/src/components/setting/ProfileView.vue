<template>
  <div>
    <loading-spinner :show="isLoading" />
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
      <form @submit.prevent="handleSubmit" class="ml-2 mr-2">
        <div class="form-group mt-2">
          <input class="form-control chat-input" v-model="form.profile" name="profile" placeholder="Enter Profile" :class="{ 'is-invalid': submitted3 && v$.form.profile.$error }" />
          <div v-if="submitted3 && v$.form.profile.$error" class="invalid-feedback">
            <span v-if="v$.form.profile.required.$invalid">Profile are required</span>
          </div>
        </div>
        <div class="d-grid d-md-flex mt-3">
          <button class="btn btn-primary" type="submit">Save</button>
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
import { defineComponent } from 'vue'
import { useVuelidate } from '@vuelidate/core'
import { required } from '@vuelidate/validators'
import { notifySuccess } from '@/notify.ts'
import { useProfileStore } from '@/stores/profile.ts'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

export default defineComponent({
  components: { LoadingSpinner },
  emits: ['clicked'],
  setup () {
    return { v$: useVuelidate(), profileStore: useProfileStore() }
  },
  data () {
    return {
      submitted3: false,
      isLoading: false,
      form: {
        profile: ''
      }
    }
  },
  validations: {
    form: {
      profile: {required}
    }
  },
  mounted () {
    this.initSelection()
  },
  methods: {
    changeProfile (profile: any) {
      this.profileStore.setActiveProfile(profile)
      this.$emit('clicked', profile)
    },
    activeFirstProfile () {
      const profiles = this.profileStore.profiles
      if (profiles.length > 0) {
        this.changeProfile(profiles[0])
      } else {
        this.$emit('clicked', null)
      }
    },
    // Load the list and select once (stored profile, else the first), firing the
    // profile-changed watchers. Used on mount + after create/delete.
    async initSelection () {
      const list = await this.profileStore.loadProfiles()
      const selected = this.profileStore.resolveActiveProfile(list)
      if (selected) this.changeProfile(selected)
    },
    // List/badge refresh only (no re-selection) for pull-to-refresh / new message.
    getAllProfiles () {
      void this.profileStore.loadProfiles()
    },
    async handleSubmit () {
      this.submitted3 = true
      this.v$.$touch()
      if (this.v$.$invalid) {
        return
      }
      this.isLoading = true
      try {
        const created = await this.profileStore.createProfile(this.form.profile)
        notifySuccess('Profile added successfully!')
        this.$emit('clicked', created)
        ;(this.$refs['add-profile'] as any).hide()
      } finally {
        this.isLoading = false
      }
    }
  }
})
</script>
