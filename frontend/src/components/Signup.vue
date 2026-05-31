<template>
    <div>
        <div class="login-box dark-mode p-3">
            <h1 class="dark-mode">Signup</h1>
            <form @submit.prevent="handleSubmit" class="ml-2 mr-2">
              <div class="form-group mt-4">
                <b-input-group>
                  <b-input-group-text>
                    <i-bi-person-fill />
                  </b-input-group-text>
                <input class="form-control chat-input" type="text" placeholder="Username" v-model="user.email" :class="{ 'is-invalid': submitted && v$.user.email.$error }" title="Enter Username">
                </b-input-group>
                <div v-if="submitted && v$.user.email.$error" class="invalid-feedback">
                  <span v-if="v$.user.email.required.$invalid">Username is required</span>
                  <span v-if="v$.user.email.minLength.$invalid">Please enter a valid Username</span>
                </div>
              </div>
              <div class="form-group mb-2 mt-4">
                <b-input-group>
                  <b-input-group-text>
                    <i-bi-shield-lock />
                  </b-input-group-text>
                <input class="chat-input form-control" v-model="user.password"  type="password" placeholder="Password" :class="{ 'is-invalid': submitted && v$.user.password.$error }" title="Enter Password">
                </b-input-group>
                <div v-if="submitted && v$.user.password.$error" class="invalid-feedback">
                    <span v-if="v$.user.password.required.$invalid">Password is required</span>
                    <span v-if="v$.user.password.minLength.$invalid">Please enter a valid password</span>
                </div>
              </div>
              <div class="form-group mb-2 mt-2">
                <b-input-group>
                  <b-input-group-text>
                    <i-bi-shield-lock />
                  </b-input-group-text>
                <input class="chat-input form-control" v-model="user.c_password"  type="password" placeholder="Confirm Password" id="clogin-input" :class="{ 'is-invalid': submitted && v$.user.c_password.$error }" title="Enter Password Again">
                </b-input-group>
                <div v-if="submitted && v$.user.c_password.$error" class="invalid-feedback">
                    <span v-if="v$.user.c_password.required.$invalid">Password is required<br></span>
                    <span v-if="v$.user.c_password.sameAsPassword.$invalid">Password and confirm password are not match!</span>
                </div>
              </div>
              <div class="d-grid">
                <button class="btn btn-primary mt-3" type="submit">Sign Up</button>
              </div>
              <div class="my-2 small">
                Already have an account? <router-link :to="loginRoute" class="mx-2">Login</router-link>
              </div>
            </form>
            <div class="d-flex my-4 justify-content-center">
                 <a href="https://www.twitter.com/0perationP" target="_blank" rel="noopener noreferrer" aria-label="Twitter" title="Twitter">
                    <i-bi-twitter class="mx-2 text-secondary" style="font-size: 2em" />
                 </a>
                 <a href="https://github.com/0perationPrivacy/" target="_blank" rel="noopener noreferrer" aria-label="Github" title="Github">
                  <i-bi-github class="mx-2 text-secondary" style="font-size: 2em" />
                 </a>
              </div>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useVuelidate } from '@vuelidate/core'
import { required, minLength, sameAs } from '@vuelidate/validators'
import { api } from '@/core/services/api.service.ts'
import { appDirectory } from '@/router/helpers.ts'
import { notifyError } from '@/notify.ts'
import type { RouteLocationRaw } from 'vue-router'
import type { ApiEnvelope } from '@shared/api-contracts.ts'

export default defineComponent({
  name: 'Signup',
  setup () {
    return { v$: useVuelidate() }
  },
  data () {
    return {
      user: {
        email: '',
        password: '',
        c_password: ''
      },
      submitted: false,
      signUpOption: false
    }
  },
  validations () {
    return {
      user: {
        email: { required, minLength: minLength(2) },
        password: { required, minLength: minLength(6) },
        c_password: { required, sameAsPassword: sameAs(this.user.password) },
      }
    }
  },
  computed: {
    loginRoute (): RouteLocationRaw {
      return { name: 'login', params: { appdirectory: appDirectory(this.$route) } }
    }
  },
  mounted () {
    this.getsignup()
  },
  methods: {
    handleSubmit (e: Event) {
      e.preventDefault()
      this.submitted = true
      this.v$.$touch()
      if (this.v$.$invalid) {
        return
      }

      api.post('auth/register', this.user)
        .then(() => {
          this.$router.push({ name: 'login', params: { appdirectory: appDirectory(this.$route) } })
        })
        .catch(error => {
          if (error.status === 401) {
            notifyError(error.data?.message, 'Oops...')
          } else if (error.status === 400) {
            notifyError(error.data?.errors?.errors?.email?.[0], 'Oops...')
          }
        })
    },

    getsignup () {
      api.post<ApiEnvelope<string>>('auth/get-signup', {})
        .then(response => {
          if (response?.data === 'on') {
            this.signUpOption = true
          } else {
            this.$router.push({ name: 'login', params: { appdirectory: appDirectory(this.$route) } })
          }
        })
        .catch(() => {
          this.signUpOption = false
        })
    }
  }
})
</script>

