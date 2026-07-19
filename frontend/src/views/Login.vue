<template>
  <div>
    <div class="login-box dark-mode p-3">
      <theme-button id-hide="false" />
      <h1 class="dark-mode">Login</h1>
      <form @submit.prevent="submitLogin" class="ml-2 mr-2" v-if="screen === 'login'">
        <div class="form-group mt-4">
          <b-input-group>
            <b-input-group-text>
              <i-bi-person-fill />
            </b-input-group-text>
            <input
              class="form-control chat-input"
              type="text"
              placeholder="Username"
              v-model="loginR$.$value.name"
              :class="{ 'is-invalid': loginR$.name.$error }"
              title="Enter Username"
            />
          </b-input-group>
          <FieldErrors :field="loginR$.name" />
        </div>
        <div class="form-group mb-2 mt-4">
          <b-input-group>
            <b-input-group-text>
              <i-bi-shield-lock />
            </b-input-group-text>
            <input
              class="chat-input form-control"
              v-model="loginR$.$value.password"
              type="password"
              placeholder="Password"
              :class="{ 'is-invalid': loginR$.password.$error }"
              title="Enter Password"
            />
          </b-input-group>
          <FieldErrors :field="loginR$.password" />
        </div>
        <div class="d-grid">
          <button class="btn btn-success mt-3 submit-btn" type="submit">Login</button>
        </div>
        <div class="my-2 small" v-if="meta.signupEnabled">Don't have an account yet? <router-link :to="{ name: 'signup' }" class="mx-2"> Sign up</router-link></div>
        <div class="d-grid d-md-flex mt-2 small" v-else>New registrations are disabled</div>
      </form>
      <form class="ml-2 mr-2 text-center" :class="{ 'd-none': screen !== 'otp' }" @submit.prevent="verifyOtp">
        <div class="form-group my-4">
          <label>Enter Verification Code</label>
          <input
            class="totp"
            v-model="otpR$.$value.otp"
            type="text"
            maxlength="6"
            placeholder="000000"
            :class="{ 'is-invalid': otpR$.otp.$error }"
            @keyup.enter="verifyOtp"
          />
          <FieldErrors :field="otpR$.otp" />
        </div>
        <div class="text-center">
          <button class="btn btn-success m-3 px-5" type="button" @click="verifyOtp" id="login-button2">Verify</button>
        </div>
        <div class="p-2">
          <button type="button" class="btn btn-link p-0" @click="showScreen('picker')">Choose A Different Verification Method</button>
        </div>
      </form>

      <form class="ml-2 mr-2 text-center" v-if="screen === 'keys' || screen === 'picker'">
        <div v-if="screen === 'picker'">
          <div class="card my-4" v-if="loginStore.hardwareKeys.length > 0">
            <div class="card-body" style="cursor: pointer" @click="showScreen('keys')">
              <div class="d-flex justify-content-between align-items-center">
                <div class="px-4">
                  <i-bi-key />
                </div>
                <div class="border-dark px-2" style="border-left: 1px solid">
                  <h4>Security Key</h4>
                  <p>Use a hardware security key that is paired with your account.</p>
                </div>
              </div>
            </div>
          </div>
          <div class="card" v-if="loginStore.totpAvailable">
            <div class="card-body" style="cursor: pointer" @click="showScreen('otp')">
              <div class="d-flex justify-content-between align-items-center">
                <div class="px-4">
                  <i-bi-calculator-fill />
                </div>
                <div class="border-dark px-2" style="border-left: 1px solid">
                  <h4>TOTP Code</h4>
                  <p>Use a time-based one-time verification passcode.</p>
                </div>
              </div>
            </div>
          </div>
          <div class="p-2">
            <button type="button" class="btn btn-link p-0 mt-2" @click="showScreen('login')">Cancel</button>
          </div>
        </div>
        <div v-else>
          <div class="card my-4" v-for="key in loginStore.hardwareKeys" :key="key._id">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-center">
                <div>
                  <i-bi-key /><span class="mr-2"> {{ key.title }} </span>
                </div>
                <div>
                  <button type="button" @click="verifyKey(key)" class="btn btn-success">Verify</button>
                </div>
              </div>
            </div>
          </div>
          <button type="button" class="btn btn-link p-0" @click="showScreen('picker')">Choose A Different Verification Method</button>
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
    <p class="version">{{ meta.version }}</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useRegle } from '@regle/core'
import { required, minLength, withMessage } from '@regle/rules'
import ThemeButton from '@/components/shared/ThemeButton.vue'
import { notifyError } from '@/core/notify.ts'
import { useLoginStore, type HardwareKey } from '@/stores/login.ts'
import { useServerMetaStore } from '@/stores/server-meta.ts'
import { useUserStore } from '@/stores/user.ts'

type Screen = 'login' | 'picker' | 'keys' | 'otp'

defineOptions({ name: 'LoginView' })

const router = useRouter()
const userStore = useUserStore()
const loginStore = useLoginStore()
const meta = useServerMetaStore()

const formState = ref({ name: '', password: '' })
const { r$: loginR$ } = useRegle(formState, {
  name: { required: withMessage(required, 'Username is required'), minLength: withMessage(minLength(2), 'Username too short') },
  password: { required: withMessage(required, 'Password is required'), minLength: withMessage(minLength(6), 'Password too short') },
})
const { r$: otpR$ } = useRegle(
  { otp: '' },
  {
    otp: { required: withMessage(required, 'Verification code is required') },
  },
)

const screen = ref<Screen>('login')

async function goToDashboard() {
  await router.push({ name: 'dashboard' })
}
// The server gates the secret directory (a wrong segment 404s before this loads), so the page only needs to skip
// itself when the user is already signed in.
async function redirectIfLoggedIn() {
  if (userStore.isLoggedIn) await goToDashboard()
}
async function submitLogin() {
  const { valid, data } = await loginR$.$validate()
  if (!valid) return

  await loginStore.passwordLogin(data)
  // Which second factor to use is the client's choice: prefer a hardware key, then TOTP, else log straight in.
  if (loginStore.hardwareKeys.length) screen.value = 'keys'
  else if (loginStore.totpAvailable) screen.value = 'otp'
  else goToDashboard()
}
async function verifyKey(key: HardwareKey) {
  const publicKey = await loginStore.hardwareKeyChallenge(key)
  const requestOptions = PublicKeyCredential.parseRequestOptionsFromJSON(publicKey)
  let assertion: PublicKeyCredential | null
  try {
    assertion = (await navigator.credentials.get({ publicKey: requestOptions })) as PublicKeyCredential | null
  } catch (error) {
    console.error(error)
    notifyError('Failed to get credentials from user', 'Key Error!')
    return
  }
  if (!assertion) {
    notifyError('No credential was returned', 'Key Error!')
    return
  }
  // `navigator.credentials.get()` always yields an authentication assertion, but `toJSON()` is typed as the
  // create()-or-get() union: `RegistrationResponseJSON | AuthenticationResponseJSON`.
  // Narrow it to read the user handle the server resolves the key by.
  const { userHandle } = (assertion.toJSON() as AuthenticationResponseJSON).response
  await loginStore.verifyHardwareKey(userHandle)
  goToDashboard()
}
async function verifyOtp() {
  const { valid, data } = await otpR$.$validate()
  if (!valid) return

  // If verification fails this will get a http 400 response and throw
  await loginStore.verifyTotp(data.otp)
  goToDashboard()
}
function showScreen(target: Screen) {
  if (target === 'login') {
    loginStore.reset()
    loginR$.$reset({ toInitialState: true })
  }
  screen.value = target
}

onMounted(redirectIfLoggedIn)
</script>
