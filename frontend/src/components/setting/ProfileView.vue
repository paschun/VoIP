<template>
  <div>
    <loading-spinner :show="isLoading" />
    <div v-for="profile in profiles" :key="profile._id" >
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
            <span v-if="profile.messageCount > 0" class="start-100 translate-middle badge border border-light rounded-circle bg-danger p-2"><span class="visually-hidden">unread messages</span></span>
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
import { defineComponent } from 'vue'
import { useVuelidate } from '@vuelidate/core'
import { required } from '@vuelidate/validators'
import { notifySuccess } from '@/notify.ts'
import { EventBus } from '@/event-bus.ts'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

export default defineComponent({
  components: { LoadingSpinner },
  emits: ['clicked'],
  setup () {
    return { v$: useVuelidate() }
  },
  data () {
    return {
      profiles: [] as any[],
      activeProfile: null as any,
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
    this.getallProfile()
  },
  methods: {
    changeProfile (profile: any) {
      this.activeProfile = profile
      localStorage.setItem('activeProfile', JSON.stringify(profile))
      this.$emit('clicked', profile)
      EventBus.$emit('changeProfile', true)
      EventBus.$emit('getOneProfile', true)
    },
    activeFirstProfile () {
      if (this.profiles.length > 0) {
        this.changeProfile(this.profiles[0])
      } else {
        this.activeProfile = null
        this.$emit('clicked', null)
      }
    },
    getallProfile () {
      this.$get('profile')
        .then((response) => {
          if (response) {
            this.profiles = response.data
            if (!this.activeProfile) {
              const profileLocal = localStorage.getItem('activeProfile')
              if (profileLocal) {
                const acPr = JSON.parse(profileLocal)
                if (acPr) {
                  for (let i = 0; i < this.profiles.length; i++) {
                    if (this.profiles[i]._id === acPr._id) {
                      this.activeProfile = this.profiles[i]
                      EventBus.$emit('changeProfile2', true)
                    }
                  }
                } else {
                  localStorage.setItem('activeProfile', JSON.stringify(this.profiles[0]))
                  this.activeProfile = this.profiles[0]
                  EventBus.$emit('changeProfile2', true)
                }
              } else {
                localStorage.setItem('activeProfile', JSON.stringify(this.profiles[0]))
                this.activeProfile = this.profiles[0]
                EventBus.$emit('changeProfile2', true)
              }
              this.$emit('clicked', this.activeProfile)
            }
          }
        })
        .catch((e) => console.error(e))
    },
    handleSubmit () {
      this.submitted3 = true
      this.v$.$touch()
      if (this.v$.$invalid) {
        return
      }
      this.isLoading = true
      this.$post('profile', this.form)
        .then((response) => {
          if (response) {
            notifySuccess('Profile added successfully!')
            this.changeProfile(response.data)
            ;(this.$refs['add-profile'] as any).hide()
            this.getallProfile()
          }
        })
        .catch((e) => {
          console.error(e)
        })
        .then(() => { this.isLoading = false })
    }
  }
})
</script>
