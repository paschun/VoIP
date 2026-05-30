<template>
    <div class="p-1">
        <form @submit.prevent="handleSubmit" class="ml-2 mr-2">
           <div class="form-group mt-2">
                <input class="form-control" name="email" v-model="form.email" placeholder="Enter Username" :class="{ 'is-invalid': submitted3 && $v.form.email.$error }" />
                <div v-if="submitted3 && $v.form.email.$error" class="invalid-feedback">
                    <span v-if="!$v.form.email.required">Email Is Required</span>
                </div>
            </div>
            <div class="form-group mt-2">
                <input class="form-control" name="password" v-model="form.password" placeholder="Enter Password" :class="{ 'is-invalid': submitted3 && $v.form.password.$error }" />
                <div v-if="submitted3 && $v.form.password.$error" class="invalid-feedback">
                    <span v-if="!$v.form.password.required">Password Is Required</span>
                </div>
            </div>
             <div class="form-group mt-2">
                <input class="form-control" name="sender_email" v-model="form.sender_email" placeholder="Email FROM" :class="{ 'is-invalid': submitted3 && $v.form.sender_email.$error }" />
                <div v-if="submitted3 && $v.form.to_email.$error" class="invalid-feedback">
                    <span v-if="!$v.form.sender_email.required">FROM Email is required</span>
                    <span v-if="!$v.form.sender_email.email">Enter Valid FROM Email</span>
                </div>
            </div>
             <div class="form-group mt-2">
                <input class="form-control" name="to_email" v-model="form.to_email" placeholder="Email TO" :class="{ 'is-invalid': submitted3 && $v.form.to_email.$error }" />
                <div v-if="submitted3 && $v.form.to_email.$error" class="invalid-feedback">
                    <span v-if="!$v.form.to_email.required">TO Email is required</span>
                    <span v-if="!$v.form.to_email.email">Enter Valid TO Email</span>
                </div>
            </div>
            <div class="form-group mt-2">
                <input class="form-control" name="host" v-model="form.host" placeholder="Enter Host (smtp.domain.com)" :class="{ 'is-invalid': submitted3 && $v.form.host.$error }" />
                <div v-if="submitted3 && $v.form.host.$error" class="invalid-feedback">
                    <span v-if="!$v.form.host.required">Host Is Required</span>
                </div>
            </div>
            <div class="form-group mt-2">
                <input class="form-control" name="port" v-model="form.port" placeholder="Enter Port (465 or 587)" :class="{ 'is-invalid': submitted3 && $v.form.port.$error }" />
                <div v-if="submitted3 && $v.form.port.$error" class="invalid-feedback">
                    <span v-if="!$v.form.port.required">Port Is Required</span>
                </div>
            </div>
            <div class="form-group mt-2">
               <b-form-checkbox id="checkbox-11" v-model="form.secure" name="secure" plain v-b-tooltip.hover.bottomright="'for 465 only'" variant="primary">
                Secure
              </b-form-checkbox>
            </div>
            <div class="form-group mt-2">
              <textarea class="form-control" name="pgpPublicKey" v-model="form.pgpPublicKey" placeholder="-----BEGIN PGP PUBLIC KEY BLOCK-----..." :class="{ 'is-invalid': submitted3 && form.pgpEncryptEnabled && !form.pgpPublicKey }">
              </textarea>
              <div v-if="form.pgpEncryptEnabled && !form.pgpPublicKey" class="invalid-feedback">
                    <span v-if="form.pgpEncryptEnabled && !form.pgpPublicKey">Public PGP Key Required</span>
                </div>
            </div>
            <div class="form-group mt-2">
              <b-form-checkbox v-model="form.pgpEncryptEnabled" name="pgpEncryptEnabled" plain v-b-tooltip.hover.bottomright="'for PGP encrypted emails'" variant="primary">
                Encrypt with PGP
              </b-form-checkbox>
            </div>
            <div class="form-group">
                <button class="btn btn-success mt-2" type="submit">Save</button>
            </div>
        </form>
        <hr>
        <div v-if="showProfile">
          <div class="form-group mt-2">
            <b-form-checkbox  v-for="profile in profiles" :key="profile._id"
              plain
              id="checkbox-1"
              name="checkbox-1"
              value="true"
              unchecked-value="false"
              :checked="profile.emailnotification == 'true'"
              @change="profileUpdate($event, profile._id)"
            >
              <span class="pr-2">&nbsp;&nbsp;{{profile.profile}}</span>
            </b-form-checkbox>
          </div>
        </div>
    </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue'
import { required, email } from 'vuelidate/lib/validators'
import { notifySuccess } from '@/notify'

export default defineComponent({
  data () {
    return {
      form: {
        email: '',
        sender_email: '',
        password: '',
        to_email: '',
        host: '',
        port: '',
        secure: false,
        pgpEncryptEnabled: false,
        pgpPublicKey: ''
      },
      submitted3: false,
      showProfile: false,
      profiles: [] as any[]
    }
  },
  validations: {
    form: {
      email: {required},
      sender_email: {required, email},
      password: {required},
      to_email: {required, email},
      host: {required},
      port: {required}
    }
  },
  mounted () {
    this.getEmailSetting()
  },
  methods: {
    handleSubmit () {
      this.submitted3 = true
      this.$v.$touch()
      if (this.$v.$invalid) {
        return
      }
      this.$post('email/create', this.form)
        .then((response) => {
          if (response) {
            notifySuccess('Setting saved successfully', 'Email Setting')
            this.getEmailSetting()
          }
        })
        .catch((e) => console.error(e))
    },
    getEmailSetting () {
      this.$get('email/setting-get')
        .then((response) => {
          if (response?.data) {
            this.form = response.data
            this.showProfile = true
            this.getProfiles()
          } else {
            this.form.email = ''
            this.form.password = ''
            this.form.to_email = ''
            this.form.host = ''
            this.form.port = ''
            this.form.secure = false
            this.form.sender_email = ''
            this.form.pgpEncryptEnabled = false
            this.form.pgpPublicKey = ''
          }
        })
        .catch((e) => {
          console.error(e)
        })
    },
    getProfiles () {
      this.$post('profile/getdata', {})
        .then((response) => {
          if (response) {
            this.profiles = response.data
          }
        })
        .catch((e) => {
          console.error(e)
        })
    },
    profileUpdate (status: any, id: any) {
      this.$post('email/save/setting', { setting_id: id, status })
        .then((response) => {
          if (response) {
            this.getProfiles()
          }
        })
        .catch((e) => {
          console.error(e)
        })
    }
  }
})
</script>

