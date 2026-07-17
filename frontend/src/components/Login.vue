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
          <div v-if="loginR$.name.$error" class="invalid-feedback">
            <span v-for="error of loginR$.$errors.name" :key="error">{{ error }}</span>
          </div>
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
          <div v-if="loginR$.password.$error" class="invalid-feedback">
            <span v-for="error of loginR$.$errors.password" :key="error">{{ error }}</span>
          </div>
        </div>
        <div class="d-grid">
          <button class="btn btn-success mt-3 submit-btn" type="submit">Login</button>
        </div>
        <div class="my-2 small" v-if="meta.signupEnabled">Don't have an account yet? <router-link :to="signupRoute" class="mx-2"> Sign up</router-link></div>
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
          <div v-if="otpR$.otp.$error" class="invalid-feedback">
            <span v-for="error of otpR$.$errors.otp" :key="error">{{ error }}</span>
          </div>
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

<script lang="ts">
import { defineComponent, ref } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { useRegle } from '@regle/core'
import { required, minLength, withMessage } from '@regle/rules'
import ThemeButton from '@/components/ThemeButton.vue'
import { notifyError } from '@/notify.ts'
import { appDirectory } from '@/router/helpers.ts'
import { useLoginStore, type HardwareKey } from '@/stores/login.ts'
import { useServerMetaStore } from '@/stores/server-meta.ts'
import { useUserStore } from '@/stores/user.ts'

type Screen = 'login' | 'picker' | 'keys' | 'otp'

export default defineComponent({
  name: 'LoginView',
  components: { ThemeButton },
  setup() {
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
    return {
      loginR$,
      otpR$,
      userStore: useUserStore(),
      loginStore: useLoginStore(),
      meta: useServerMetaStore(),
    }
  },
  data(): { screen: Screen } {
    return { screen: 'login' }
  },
  computed: {
    signupRoute(): RouteLocationRaw {
      return { name: 'signup', params: { appdirectory: appDirectory(this.$route) } }
    },
  },
  async mounted() {
    await this.redirectIfLoggedIn()
  },
  methods: {
    // The server gates the secret directory (a wrong segment 404s before this loads), so the page only needs to skip
    // itself when the user is already signed in.
    async redirectIfLoggedIn() {
      if (this.userStore.isLoggedIn) await this.goToDashboard()
    },
    async goToDashboard() {
      await this.$router.push({ name: 'dashboard', params: { appdirectory: appDirectory(this.$route) } })
    },
    async submitLogin() {
      const { valid, data } = await this.loginR$.$validate()
      if (!valid) return

      await this.loginStore.passwordLogin(data)
      // Which second factor to use is the client's choice: prefer a hardware key, then TOTP, else log straight in.
      if (this.loginStore.hardwareKeys.length) this.screen = 'keys'
      else if (this.loginStore.totpAvailable) this.screen = 'otp'
      else this.goToDashboard()
    },
    async verifyKey(key: HardwareKey) {
      const publicKey = await this.loginStore.hardwareKeyChallenge(key)
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
      await this.loginStore.verifyHardwareKey(userHandle)
      this.goToDashboard()
    },
    async verifyOtp() {
      const { valid, data } = await this.otpR$.$validate()
      if (!valid) return

      // If verification fails this will get a http 400 response and throw
      await this.loginStore.verifyTotp(data.otp)
      this.goToDashboard()
    },
    showScreen(screen: Screen) {
      if (screen === 'login') {
        this.loginStore.reset()
        this.loginR$.$reset({ toInitialState: true })
      }
      this.screen = screen
    },
  },
})
</script>
