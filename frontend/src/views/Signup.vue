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
            >
          </b-input-group>
          <FieldErrors :field="r$.name" />
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
            >
          </b-input-group>
          <FieldErrors :field="r$.password" />
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
            >
          </b-input-group>
          <FieldErrors :field="r$.c_password" />
        </div>
        <div class="d-grid">
          <button class="btn btn-primary mt-3" type="submit" :disabled="!r$.$correct">Sign Up</button>
        </div>
        <div class="my-2 small">Already have an account? <router-link :to="{ name: 'login' }" class="mx-2">Login</router-link></div>
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

<script setup lang="ts">
import { onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useRegle } from '@regle/core'
import { required, minLength, sameAs, lowercase, withMessage } from '@regle/rules'
import { DetailedError } from 'hono/client'
import { client, request } from '@/core/rpc.client.ts'
import { useServerMetaStore } from '@/stores/server-meta.ts'

defineOptions({ name: 'SignupView' })

const router = useRouter()
const meta = useServerMetaStore()
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

async function handleSubmit() {
  const { valid, data } = await r$.$validate()
  if (!valid) return
  try {
    await request(client.api.auth.register.$post({ json: { name: data.name, password: data.password } }))
  } catch (err) {
    // Duplicate username comes back as a 409
    if (err instanceof DetailedError) {
      r$.$setExternalErrors({ name: [err.detail?.data?.message] })
    }
    throw err // skips logic below
  }
  // pure-JS navigation, not a reload of the page; named locations inherit the current appdirectory param
  router.push({ name: 'login' })
}

async function redirectIfSignupDisabled() {
  // todo: not the best security mechanism. should be blocked on the router level ideally
  await meta.signupReady
  if (!meta.signupEnabled) await router.push({ name: 'login' })
}

onMounted(redirectIfSignupDisabled)
</script>
