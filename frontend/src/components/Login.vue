<template>
  <div>
      <div class="login-box dark-mode p-3">
          <theme-button id-hide="false" />
          <h1 class="dark-mode">Login</h1>
          <form @submit.prevent="submitLogin" class="ml-2 mr-2" v-if="!otpScreen && !keyScreen">
            <div class="form-group mt-4">
              <b-input-group>
                <b-input-group-text>
                  <i-bi-person-fill />
                </b-input-group-text>
              <input class="form-control chat-input" type="text" placeholder="Username" v-model="loginR$.$value.name" :class="{ 'is-invalid': loginR$.name.$error }" title="Enter Username">
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
              <input class="chat-input form-control" v-model="loginR$.$value.password"  type="password" placeholder="Password" :class="{ 'is-invalid': loginR$.password.$error }" title="Enter Password">
             </b-input-group>
              <div v-if="loginR$.password.$error" class="invalid-feedback">
                  <span v-for="error of loginR$.$errors.password" :key="error">{{ error }}</span>
              </div>
            </div>
            <div class="d-grid">
              <button class="btn btn-success mt-3 submit-btn" type="submit">Login</button>
            </div>
            <div class="my-2 small" v-if="signUpOption">
              Don’t have an account yet? <router-link :to="signupRoute" class="mx-2"> Sign up</router-link>
            </div>
            <div  class="d-grid d-md-flex mt-2 small" v-else>
              New registrations are disabled
            </div>
          </form>
          <form class="ml-2 mr-2 text-center" v-bind:class="{ 'd-none': !otpScreen }" @submit.prevent="verifyOtp">
            <div class="form-group my-4">
              <label>Enter Verification Code</label>
              <input class="totp" v-model="otpR$.$value.otp" type="text" maxlength="6" placeholder="000000" :class="{ 'is-invalid': otpR$.otp.$error }" @keyup.enter="verifyOtp">
              <div v-if="otpR$.otp.$error" class="invalid-feedback">
                  <span v-for="error of otpR$.$errors.otp" :key="error">{{ error }}</span>
              </div>
            </div>
            <div class="text-center">
              <button class="btn btn-success m-3 px-5" type="button" @click="verifyOtp" id="login-button2">Verify</button>
            </div>
            <div class="p-2">
                 <button type="button" class="btn btn-link p-0" @click="chooseMethods('show_method')">Choose A Different Verification Method</button>
            </div>
          </form>

          <form class="ml-2 mr-2 text-center" v-if="keyScreen">
            <div class="" v-if="verification_method">
              <div class="card my-4"  v-if="keys.length > 0">
                <div class="card-body" style="cursor: pointer;" @click="chooseMethods('hardware_key')">
                  <div class="d-flex justify-content-between align-items-center">
                    <div class="px-4">
                      <i-bi-key />
                    </div>
                    <div class="border-dark px-2" style="border-left: 1px solid;">
                      <h4>Security Key</h4>
                      <p>Use a hardware security key that is paired with your account.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div class="card" v-if="totpAvailable">
                <div class="card-body" style="cursor: pointer;" @click="chooseMethods('totp')" >
                  <div class="d-flex justify-content-between align-items-center">
                    <div class="px-4">
                      <i-bi-calculator-fill />
                    </div>
                    <div class="border-dark px-2" style="border-left: 1px solid;">
                      <h4>TOTP Code</h4>
                      <p>Use a time based on-time verification passcode. </p>
                    </div>
                  </div>
                </div>
              </div>
              <div class="p-2">
                <button type="button" class="btn btn-link p-0 mt-2" @click="chooseMethods('Cancel')">Cancel</button>
              </div>
            </div>
            <div v-else>
              <div class="card my-4" v-for="key in keys" :key="key._id">
                <div class="card-body">
                  <div class="d-flex justify-content-between align-items-center">
                    <div>
                      <i-bi-key /><span class="mr-2"> {{key.title}} </span>
                    </div>
                    <div>
                      <button type="button" @click="verifyKey(key)" class="btn btn-success">Verify</button>
                    </div>
                  </div>
                </div>
              </div>
              <button type="button" class="btn btn-link p-0" @click="chooseMethods('show_method')">Choose A Different Verification Method</button>
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
      <p class="version">{{versionOption}}</p>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'
import ThemeButton from '@/components/ThemeButton.vue'
import { useRegle } from '@regle/core'
import { required, minLength, withMessage } from '@regle/rules'
import { useUserStore } from '@/stores/user.ts'
import { appDirectory } from '@/router/helpers.ts'
import { notifyError } from '@/notify.ts'
import { client, request } from '@/core/rpc.client.ts'
import type { RouteLocationRaw } from 'vue-router'

interface HardwareKey {
  _id: string
  title: string | null
}

export default defineComponent({
name: 'LoginView',
components: { ThemeButton },
setup () {
  const formState = ref({ name: '', password: '' })
  const { r$: loginR$ } = useRegle(formState, {
    name: { required: withMessage(required, 'Username is required'), minLength: withMessage(minLength(2), 'Username too short') },
    password: { required: withMessage(required, 'Password is required'), minLength: withMessage(minLength(6), 'Password too short') }
  })
  const { r$: otpR$ } = useRegle({ otp: '' }, {
    otp: { required: withMessage(required, 'Verification code is required') }
  })
  return { loginR$, otpR$, formState, userStore: useUserStore() }
},
data () {
  return {
    otpScreen: false,
    signUpOption: false,
    versionOption: 'v1.0.0',
    activeUser: {
      user: null as any,
      token: ''
    },
    keyScreen: false,
    keys: [] as HardwareKey[],
    totpAvailable: false,
    verification_method: false
  }
},
computed: {
  signupRoute (): RouteLocationRaw {
    return { name: 'signup', params: { appdirectory: appDirectory(this.$route) } }
  }
},
mounted () {
  this.redirectIfLoggedIn()
  this.getSignup()
  this.getVersion()
},
methods: {
  // The server gates the secret directory (a wrong segment 404s before this loads), so the page only needs to skip
  // itself when the user is already signed in.
  redirectIfLoggedIn () {
    if (this.userStore.isLoggedIn) {
      this.$router.push({ name: 'dashboard', params: { appdirectory: appDirectory(this.$route) } })
    }
  },
  async getSignup () {
    const res = await request(client.api.auth['signup-enabled'].$get())
    this.signUpOption = res.data
  },
  async getVersion () {
    const res = await request(client.api.auth.version.$get())
    this.versionOption = res.data
  },
  async submitLogin () {
    const { valid, data } = await this.loginR$.$validate()
    if (!valid) return

    const res = await request(client.api.auth.login.$post({ json: data }))
    const { user, token, hardwareKeys } = res.data
    this.keys = hardwareKeys
    this.totpAvailable = user.totp
    this.verification_method = false
    // Which second factor to use is the client's choice: prefer a hardware key, then TOTP, else log straight in.
    if (hardwareKeys.length) {
      this.activeUser.token = token
      this.activeUser.user = user
      this.keyScreen = true
      this.otpScreen = false
    } else if (user.totp) {
      this.activeUser.token = token
      this.activeUser.user = user
      this.otpScreen = true
    } else {
      this.userStore.login(user, token)
      this.$router.push({ name: 'dashboard', params: { appdirectory: appDirectory(this.$route) } })
    }
  },
  async verifyKey (key: HardwareKey) {
    const challengeRes = await request(client.api.hardwarekey.authentication.challenge.$post({ json: { userId: this.activeUser.user._id, title: key.title ?? '' } }))
    const requestOptions = PublicKeyCredential.parseRequestOptionsFromJSON(challengeRes.data.publicKey)
    let assertion: PublicKeyCredential | null
    try {
      assertion = await navigator.credentials.get({ publicKey: requestOptions }) as PublicKeyCredential | null
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
    await request(client.api.hardwarekey.authentication.verify.$post({ json: { userId: this.activeUser.user._id, response: { userHandle } } }))
    this.userStore.login(this.activeUser.user, this.activeUser.token)
    this.activeUser.token = ''
    this.activeUser.user = null
    this.$router.push({ name: 'dashboard', params: { appdirectory: appDirectory(this.$route) } })
  },
  async verifyOtp () {
    const { valid } = await this.otpR$.$validate()
    if (!valid) return

    // If verification fails this will get a http 400 response and throw
    await request(client.api.auth.totp.verify.$post({ json: { userId: this.activeUser.user._id, code: this.otpR$.$value.otp } }))
    this.userStore.login(this.activeUser.user, this.activeUser.token)
    this.activeUser.token = ''
    this.activeUser.user = null
    this.$router.push({ name: 'dashboard', params: { appdirectory: appDirectory(this.$route) } })
  },
  chooseMethods (method: string) {
    if (method === 'hardware_key') {
      this.otpScreen = false
      this.keyScreen = true
      this.verification_method = false
    } else if (method === 'show_method') {
      this.otpScreen = false
      this.keyScreen = true
      this.verification_method = true
    } else if (method === 'Cancel') {
      this.otpScreen = false
      this.keyScreen = false
      this.activeUser = {
        user: null,
        token: ''
      }
      this.formState = { name: '', password: '' } // todo: change to $reset
    } else if (method === 'totp') {
      this.keyScreen = false
      this.otpScreen = true
      this.verification_method = false
    }
  }
}
})
</script>
