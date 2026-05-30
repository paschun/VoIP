<template>
  <div>
      <div class="login-box dark-mode p-3">
          <theme-button id-hide="false" />
          <h1 class="dark-mode">Login</h1>
          <form @submit.prevent="handleSubmit" class="ml-2 mr-2" v-if="!otpScreen && !keyScreen">
            <div class="form-group mt-4">
              <b-input-group>
                <b-input-group-prepend is-text>
                  <b-icon icon="person-fill"></b-icon>
                </b-input-group-prepend>
              <input class="form-control chat-input" type="text" placeholder="Username" v-model="user.email" :class="{ 'is-invalid': submitted && $v.user.email.$error }" title="Enter Username">
               </b-input-group>
              <div v-if="submitted && $v.user.email.$error" class="invalid-feedback">
                <span v-if="!$v.user.email.required">Username is required</span>
                <span v-if="!$v.user.email.minLength">Username is invalid</span>
              </div>
            </div>
            <div class="form-group mb-2 mt-4">
              <b-input-group>
                <b-input-group-prepend is-text>
                  <b-icon icon="shield-lock"></b-icon>
                </b-input-group-prepend>
              <input class="chat-input form-control" v-model="user.password"  type="password" placeholder="Password" :class="{ 'is-invalid': submitted && $v.user.password.$error }" title="Enter Password">
             </b-input-group>
              <div v-if="submitted && $v.user.password.$error" class="invalid-feedback">
                  <span v-if="!$v.user.password.required">Password is required</span>
                  <span v-if="!$v.user.password.minLength">Password is invalid</span>
              </div>
            </div>
            <div class="d-grid">
              <button class="btn btn-success mt-3" type="submit" id="login-button">Login</button>
            </div>
            <div class="my-2 small" v-if="signUpOption">
              Don’t have an account yet? <router-link :to="signupRoute" class="mx-2"> Sign up</router-link>
            </div>
            <div  class="d-grid d-md-flex mt-2 small" v-else>
              New registrations are disabled
            </div>
          </form>
          <form class="ml-2 mr-2 text-center" v-bind:class="{ 'd-none': !otpScreen }" @submit.prevent="handleSubmit2">
            <div class="form-group my-4">
              <label>Enter Verification Code</label>
              <input class="totp" v-model="otpForm.otp"  type="form-control" maxlength="6" placeholder="000000" :class="{ 'is-invalid': submitted2 && otpError }" @keyup.enter="handleSubmit2($event)">
              <div v-if="submitted2 && otpError" class="invalid-feedback">
                  <span>Verification code is required</span>
              </div>
            </div>
            <div class="text-center">
              <button class="btn btn-success m-3 px-5" type="button" v-on:click="handleSubmit2($event)" id="login-button2">Verify</button>
            </div>
            <div class="p-2">
                 <a href="javascript:void(0)" @click="chooseMethods('show_method')">Choose A Different Verification Method</a>
            </div>
          </form>

          <form class="ml-2 mr-2 text-center" v-if="keyScreen">
            <div class="" v-if="verification_method">
              <div class="card my-4"  v-if="keys.length > 0">
                <div class="card-body" style="cursor: pointer;" @click="chooseMethods('hardware_key')">
                  <div class="d-flex justify-content-between align-items-center">
                    <div class="px-4">
                      <b-icon icon="key"></b-icon>
                    </div>
                    <div class="border-dark px-2" style="border-left: 1px solid;">
                      <h4>Security Key</h4>
                      <p>Use a hardwaree security key that is paired with your account. </p>
                    </div>
                  </div>
                </div>
              </div>
              <div class="card" v-if="mfa">
                <div class="card-body" style="cursor: pointer;" @click="chooseMethods('mfa')" >
                  <div class="d-flex justify-content-between align-items-center">
                    <div class="px-4">
                      <b-icon icon="calculator-fill"></b-icon>
                    </div>
                    <div class="border-dark px-2" style="border-left: 1px solid;">
                      <h4>TOTP Code</h4>
                      <p>Use a time based on-time verification passcode. </p>
                    </div>
                  </div>
                </div>
              </div>
              <div class="p-2">
                <a class="mt-2" href="javascript:void(0)" @click="chooseMethods('Cancel')">Cancel</a>
              </div>
            </div>
            <div v-else>
              <div class="card my-4" v-for="key in keys" :key="key._id">
                <div class="card-body">
                  <div class="d-flex justify-content-between align-items-center">
                    <div>
                      <b-icon icon="key"></b-icon><span class="mr-2"> {{key.title}} </span>
                    </div>
                    <div>
                      <button type="button" @click="verifyKey(key)" class="btn btn-success">Verify</button>
                    </div>
                  </div>
                </div>
              </div>
              <a href="javascript:void(0)" @click="chooseMethods('show_method')">Choose A Different Verification Method</a>
            </div>
          </form>

          <div class="d-flex my-4 justify-content-center">
               <a href="https://www.twitter.com/0perationP" target="_blank" rel="noopener noreferrer" aria-label="Twitter" title="Twitter">
                  <b-icon font-scale="2" icon="twitter" variant="secondary" class="mx-2"></b-icon>
               </a>
               <a href="https://github.com/0perationPrivacy/" target="_blank" rel="noopener noreferrer" aria-label="Github" title="Github">
                <b-icon font-scale="2" icon="github" variant="secondary" class="mx-2"></b-icon>
               </a>
            </div>
      </div>
      <p class="version">{{versionOption}}</p>
  </div>
</template>

<script>
import { post } from '../core/module/common.module'
import ThemeButton from '@/components/ThemeButton.vue'
import { required, minLength } from 'vuelidate/lib/validators'
import { publicKeyCredentialToJSON } from '@/helper'
import { notifyError } from '@/notify'

/** Convert challenge + allowCredentials[].id from base64url strings to Uint8Arrays in-place. */
const preformatGetAssertReq = (getAssert) => {
  getAssert.challenge = Uint8Array.fromBase64(getAssert.challenge, { alphabet: 'base64url' })
  for (const cred of getAssert.allowCredentials ?? []) {
    cred.id = Uint8Array.fromBase64(cred.id, { alphabet: 'base64url' })
  }
  return getAssert
}

export default {
name: 'Login',
components: { ThemeButton },
data () {
  return {
    otpScreen: false,
    otpError: false,
    signUpOption: false,
    versionOption: 'v1.0.0',
    activeUser: {
      user: null,
      token: ''
    },
    user: {
      email: '',
      password: ''
    },
    otpForm: {
      otp: ''
    },
    submitted: false,
    submitted2: false,
    signupRoute: '',
    keyScreen: false,
    keys: [],
    mfa: false,
    verification_method: false
  }
},
validations: {
  user: {
    email: { required, minLength: minLength(2) },
    password: { required, minLength: minLength(6) }
  }
},
mounted () {
  this.signupRoute = `/${this.$route.params.appdirectory}/signup`
  this.fnLogin()
  this.getsignup()
  this.getVersion()
},
methods: {
  fnLogin () {
    const request = {
      url: 'auth/check-directoryname',
      data: { dirname: this.$route.params.appdirectory }
    }
    this.$store
      .dispatch(post, request)
      .then((response) => {
        const { status, dir } = response.data
        const loggedIn = !!this.$cookie.get('access_token')

        if (loggedIn) {
          if (status === 'nodir' || status === 'no-name' || status === 'true') {
            this.$router.push(`/${dir}/dashboard`)
          } else if (status === 'false') {
            this.$router.push('/404')
          }
        } else if ((status === 'nodir' || status === 'no-name') && dir === 'voip') {
          this.$router.push(`/${dir}`)
        } else if (status === 'false' || status === 'no-name') {
          this.$router.push('/404')
        }
      })
      .catch((e) => console.error(e))
  },
  getsignup () {
    const request = { data: {}, url: 'auth/get-signup' }
    this.$store
      .dispatch(post, request)
      .then((response) => { this.signUpOption = response?.data === 'on' })
      .catch(() => { this.signUpOption = false })
  },
  getVersion () {
    const request = {
      data: {},
      url: 'auth/get-version'
    }
    this.$store
      .dispatch(post, request)
      .then((response) => {
        if (response) {
          this.versionOption = response.data
        }
      })
      .catch(() => {})
  },
  handleSubmit (e) {
    e.preventDefault()
    this.submitted = true
    this.$v.$touch()
    if (this.$v.$invalid) {
      return
    }

    const request = {
      data: this.user,
      url: 'auth/login'
    }
    this.$store
      .dispatch(post, request)
      .then((response) => {
        if (response) {
          this.keys = response.harwarekey
          this.mfa = response.mfa
          this.verification_method = false
          if (response.status === 'hardwarekey') {
            this.activeUser.token = response.token
            this.activeUser.user = response.data
            this.keyScreen = true
            this.otpScreen = false
          } else if (response.status === 'mfa') {
            this.activeUser.token = response.token
            this.activeUser.user = response.data
            this.otpScreen = true
          } else {
            this.$cookie.set('access_token', response.token, 30)
            this.$cookie.set('userdata', JSON.stringify(response.data), 30)
            this.$router.push(`/${this.$route.params.appdirectory}/dashboard`)
          }
        }
      })
      .catch(() => {})
  },
  async verifyKey (key) {
    const request = {
      data: { user: this.activeUser.user._id, title: key.title },
      url: 'hardwarekey/login-key'
    }
    let getAssertionChallenge
    try {
      getAssertionChallenge = await this.$store.dispatch(post, request)
    } catch { /* ignore */ }
    if (!getAssertionChallenge) return
    getAssertionChallenge = preformatGetAssertReq(getAssertionChallenge)
    try {
      let newCredentialInfo = await navigator.credentials.get({publicKey: getAssertionChallenge})
      newCredentialInfo = publicKeyCredentialToJSON(newCredentialInfo)
      const loginReq = {
        data: newCredentialInfo,
        url: 'hardwarekey/login'
      }
      try {
        const serverResponse = await this.$store.dispatch(post, loginReq)
        if (serverResponse) {
          if (serverResponse.status !== 'true') { throw new Error('Error registering user! Server returned: ' + serverResponse.errorMessage) }
          this.$cookie.set('access_token', this.activeUser.token, 30)
          this.$cookie.set('userdata', JSON.stringify(this.activeUser.user), 30)
          this.activeUser.token = ''
          this.activeUser.user = null
          this.$router.push(`/${this.$route.params.appdirectory}/dashboard`)
        }
      } catch { /* ignore */ }
    } catch (error) {
      console.error(error)
      notifyError('Login failed with security key.', 'Key!')
    }
  },
  handleSubmit2 (e) {
    if (e?.preventDefault) {
      console.log("Prevented default!")
      e.preventDefault();
    }
    this.submitted2 = true
    if (this.otpForm.otp.trim() !== '') {
      const request = {
        data: { user: this.activeUser.user._id, verification_code: this.otpForm.otp },
        url: 'auth/otp-verify'
      }
      this.$store
        .dispatch(post, request)
        .then((response) => {
          if (response) {
            if (response.status === 'true') {
              this.$cookie.set('access_token', this.activeUser.token, 30)
              this.$cookie.set('userdata', JSON.stringify(this.activeUser.user), 30)
              this.activeUser.token = ''
              this.activeUser.user = null
              this.$router.push(`/${this.$route.params.appdirectory}/dashboard`)
            }
          }
        })
        .catch(() => {})
    } else {
      this.otpError = true
    }
  },
  chooseMethods (method) {
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
      this.user = {
        email: '',
        password: ''
      }
    } else if (method === 'mfa') {
      this.keyScreen = false
      this.otpScreen = true
      this.verification_method = false
    }
  }
}
}
</script>
