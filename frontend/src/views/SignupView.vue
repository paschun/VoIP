<template>
  <div>
    <div class="login-box p-3">
      <h1>Signup</h1>
      <form class="ml-2 mr-2" @submit.prevent="handleSubmit">
        <div class="form-group mt-4">
          <BInputGroup>
            <BInputGroupText>
              <IBiPersonFill />
            </BInputGroupText>
            <input
              v-model="r$.$value.name"
              class="form-control rounded-input"
              type="text"
              placeholder="Username"
              :class="{ 'is-invalid': r$.name.$error }"
              title="Enter Username"
            >
          </BInputGroup>
          <FieldErrors :field="r$.name" />
        </div>
        <div class="form-group mb-2 mt-4">
          <BInputGroup>
            <BInputGroupText>
              <IBiShieldLock />
            </BInputGroupText>
            <input
              v-model="r$.$value.password"
              class="rounded-input form-control"
              type="password"
              placeholder="Password"
              :class="{ 'is-invalid': r$.password.$error }"
              title="Enter Password"
            >
          </BInputGroup>
          <FieldErrors :field="r$.password" />
        </div>
        <div class="form-group mb-2 mt-2">
          <BInputGroup>
            <BInputGroupText>
              <IBiShieldLock />
            </BInputGroupText>
            <input
              v-model="r$.$value.c_password"
              class="rounded-input form-control"
              type="password"
              placeholder="Confirm Password"
              :class="{ 'is-invalid': r$.c_password.$error }"
              title="Enter Password Again"
            >
          </BInputGroup>
          <FieldErrors :field="r$.c_password" />
        </div>
        <div class="d-grid">
          <button class="btn btn-primary mt-3" type="submit" :disabled="!r$.$correct">Sign Up</button>
        </div>
        <div class="my-2 small">Already have an account? <RouterLink :to="{ name: 'login' }" class="mx-2">Login</RouterLink></div>
      </form>
      <div class="d-flex my-4 justify-content-center">
        <a href="https://github.com/0perationPrivacy/" target="_blank" rel="noopener noreferrer" aria-label="Github" title="Github">
          <IBiGithub class="mx-2 text-secondary" style="font-size: 2em" />
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
import { client, request } from '@/core/rpc.client.ts'
import { setServerErrors } from '@/core/handle-error.ts'
import { useServerMetaStore } from '@/stores/server-meta.ts'

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
    setServerErrors(r$, err, (message) => ({ name: [message] }))
    throw err // skips logic below
  }
  // pure-JS navigation, not a reload of the page; named locations inherit the current appdirectory param
  await router.push({ name: 'login' })
}

async function redirectIfSignupDisabled() {
  // todo: not the best security mechanism. should be blocked on the router level ideally
  await meta.signupReady
  if (!meta.signupEnabled) await router.push({ name: 'login' })
}

onMounted(redirectIfSignupDisabled)
</script>
