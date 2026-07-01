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
            <input
              class="form-control chat-input"
              type="text"
              placeholder="Username"
              v-model="r$.$value.name"
              :class="{ 'is-invalid': r$.name.$error }"
              title="Enter Username"
            />
          </b-input-group>
          <div v-if="r$.name.$error" class="invalid-feedback">
            <span v-for="error of r$.name.$errors" :key="error">{{ error }}</span>
          </div>
        </div>
        <div class="form-group mb-2 mt-4">
          <b-input-group>
            <b-input-group-text>
              <i-bi-shield-lock />
            </b-input-group-text>
            <input
              class="chat-input form-control"
              v-model="r$.$value.password"
              type="password"
              placeholder="Password"
              :class="{ 'is-invalid': r$.password.$error }"
              title="Enter Password"
            />
          </b-input-group>
          <div v-if="r$.password.$error" class="invalid-feedback">
            <span v-for="error of r$.password.$errors" :key="error">{{ error }}</span>
          </div>
        </div>
        <div class="form-group mb-2 mt-2">
          <b-input-group>
            <b-input-group-text>
              <i-bi-shield-lock />
            </b-input-group-text>
            <input
              class="chat-input form-control"
              v-model="r$.$value.c_password"
              type="password"
              placeholder="Confirm Password"
              :class="{ 'is-invalid': r$.c_password.$error }"
              title="Enter Password Again"
            />
          </b-input-group>
          <div v-if="r$.c_password.$error" class="invalid-feedback">
            <span v-for="error of r$.c_password.$errors" :key="error">{{ error }}</span>
          </div>
        </div>
        <div class="d-grid">
          <button class="btn btn-primary mt-3" type="submit" :disabled="!r$.$correct">Sign Up</button>
        </div>
        <div class="my-2 small">Already have an account? <router-link :to="loginRoute" class="mx-2">Login</router-link></div>
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
import { defineComponent, reactive } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { useRegle } from '@regle/core'
import { required, minLength, sameAs, lowercase, withMessage } from '@regle/rules'
import { DetailedError } from 'hono/client'
import { client, request } from '@/core/rpc.client.ts'
import { appDirectory } from '@/router/helpers.ts'

export default defineComponent({
  name: 'SignupView',
  setup() {
    const form = reactive({ name: '', password: '', c_password: '' })
    const { r$ } = useRegle(form, {
      name: {
        required: withMessage(required, 'Username is required'), // default: This field is required
        minLength: minLength(2),
        lowercase,
      },
      password: {
        required: withMessage(required, 'Password is required'),
        minLength: minLength(6),
      },
      // c_password is frontend-validation only. Field is not passed to backend.
      c_password: {
        required: required,
        sameAs: sameAs(() => form.password),
      },
    })
    return { r$ }
  },
  computed: {
    loginRoute(): RouteLocationRaw {
      return { name: 'login', params: { appdirectory: appDirectory(this.$route) } }
    },
  },
  mounted() {
    void this.redirectIfSignupDisabled()
  },
  methods: {
    async handleSubmit() {
      const { valid, data } = await this.r$.$validate()
      if (!valid) return
      try {
        await request(client.api.auth.register.$post({ json: { name: data.name, password: data.password } }))
      } catch (err) {
        // Duplicate username comes back as a 409
        if (err instanceof DetailedError) {
          this.r$.$setExternalErrors({ name: [err.detail?.data?.message] })
        }
        throw err // skips logic below
      }
      this.$router.push(this.loginRoute) // pure-JS navigation, not a reload of the page
    },

    async redirectIfSignupDisabled() {
      // todo: this API call in both here and Login.vue . dedupe somehow?
      const { data } = await request(client.api.auth['signup-enabled'].$get())
      // todo: not the best security mechanism. should be blocked on the router level ideally
      if (!data) this.$router.push(this.loginRoute)
    },
  },
})
</script>
