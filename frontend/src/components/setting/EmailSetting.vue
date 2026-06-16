<template>
    <div class="p-1">
        <form @submit.prevent="handleSubmit" class="ml-2 mr-2">
           <div class="form-group mt-2">
                <input class="form-control" name="email" v-model="form.email" placeholder="Enter Username" :class="{ 'is-invalid': saveEmailSettingsAttempted && v$.form.email.$error }" />
                <div v-if="saveEmailSettingsAttempted && v$.form.email.$error" class="invalid-feedback">
                    <span v-if="v$.form.email.required.$invalid">Email Is Required</span>
                </div>
            </div>
            <div class="form-group mt-2">
                <input class="form-control" name="password" v-model="form.password" placeholder="Enter Password" :class="{ 'is-invalid': saveEmailSettingsAttempted && v$.form.password.$error }" />
                <div v-if="saveEmailSettingsAttempted && v$.form.password.$error" class="invalid-feedback">
                    <span v-if="v$.form.password.required.$invalid">Password Is Required</span>
                </div>
            </div>
             <div class="form-group mt-2">
                <input class="form-control" name="sender_email" v-model="form.sender_email" placeholder="Email FROM" :class="{ 'is-invalid': saveEmailSettingsAttempted && v$.form.sender_email.$error }" />
                <div v-if="saveEmailSettingsAttempted && v$.form.sender_email.$error" class="invalid-feedback">
                    <span v-if="v$.form.sender_email.required.$invalid">FROM Email is required</span>
                    <span v-if="v$.form.sender_email.email.$invalid">Enter Valid FROM Email</span>
                </div>
            </div>
             <div class="form-group mt-2">
                <input class="form-control" name="to_email" v-model="form.to_email" placeholder="Email TO" :class="{ 'is-invalid': saveEmailSettingsAttempted && v$.form.to_email.$error }" />
                <div v-if="saveEmailSettingsAttempted && v$.form.to_email.$error" class="invalid-feedback">
                    <span v-if="v$.form.to_email.required.$invalid">TO Email is required</span>
                    <span v-if="v$.form.to_email.email.$invalid">Enter Valid TO Email</span>
                </div>
            </div>
            <div class="form-group mt-2">
                <input class="form-control" name="host" v-model="form.host" placeholder="Enter Host (smtp.domain.com)" :class="{ 'is-invalid': saveEmailSettingsAttempted && v$.form.host.$error }" />
                <div v-if="saveEmailSettingsAttempted && v$.form.host.$error" class="invalid-feedback">
                    <span v-if="v$.form.host.required.$invalid">Host Is Required</span>
                </div>
            </div>
            <div class="form-group mt-2">
                <input class="form-control" name="port" v-model="form.port" placeholder="Enter Port (465 or 587)" :class="{ 'is-invalid': saveEmailSettingsAttempted && v$.form.port.$error }" />
                <div v-if="saveEmailSettingsAttempted && v$.form.port.$error" class="invalid-feedback">
                    <span v-if="v$.form.port.required.$invalid">Port Is Required</span>
                </div>
            </div>
            <div class="form-group mt-2">
               <b-form-checkbox id="checkbox-11" v-model="form.secure" name="secure" plain v-b-tooltip.hover.bottomright="'for 465 only'">
                Secure
              </b-form-checkbox>
            </div>
            <div class="form-group mt-2">
              <textarea class="form-control" name="pgpPublicKey" v-model="form.pgpPublicKey" placeholder="-----BEGIN PGP PUBLIC KEY BLOCK-----..." :class="{ 'is-invalid': saveEmailSettingsAttempted && v$.form.pgpPublicKey.$error }">
              </textarea>
              <div v-if="saveEmailSettingsAttempted && v$.form.pgpPublicKey.$error" class="invalid-feedback">
                    <span v-if="v$.form.pgpPublicKey.required.$invalid">Public PGP Key Required</span>
                </div>
            </div>
            <div class="form-group mt-2">
              <b-form-checkbox v-model="form.pgpEncryptEnabled" name="pgpEncryptEnabled" plain v-b-tooltip.hover.bottomright="'for PGP encrypted emails'">
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
            <b-form-checkbox v-for="profile in profiles" :key="profile._id"
              :name="'checkbox-' + profile._id"
              :value="strTrue"
              :unchecked-value="strFalse"
              :model-value="profile.emailnotification"
              @update:model-value="profileUpdate($event, profile._id)"
            >
              <span class="pr-2">&nbsp;&nbsp;{{profile.profile}}</span>
            </b-form-checkbox>
          </div>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useVuelidate } from '@vuelidate/core'
import { required, email, requiredIf } from '@vuelidate/validators'
import { notifySuccess } from '@/notify.ts'
import type { Profile, ProfilesResponse, StringBoolean } from '@shared/api-contracts.ts'
import type { EmailDoc } from '@shared/schema/email.ts'
import type { EmailSettingsResponse, SaveEmailSettingsResponse, SaveEmailSettingResponse } from '@shared/contracts/email.ts'

/** The editable subset of the Email document the form lets the user change (a frontend concern, not a wire contract). */
type EmailFields = Pick<EmailDoc,
  'email' | 'sender_email' | 'password' | 'to_email' | 'host' | 'port' | 'secure' | 'pgpEncryptEnabled' | 'pgpPublicKey'>

/**
 * Form/binding shape, derived from `EmailFields` so it tracks the schema. The mapped type rebuilds it field by field:
 * `[K in keyof EmailFields]` iterates its keys, `-?` removes the optional `?` (every field must exist for v-model), and
 * `NonNullable<…>` strips `| null | undefined` — so `email?: string | null` becomes `email: string`.
 */
type EmailForm = { [K in keyof EmailFields]-?: NonNullable<EmailFields[K]> }

/** Build a full, non-null form from a (partial or absent) saved document — reused for init, load, and reset. */
const toEmailForm = (data?: EmailDoc | null): EmailForm => ({
  email: data?.email ?? '',
  sender_email: data?.sender_email ?? '',
  password: data?.password ?? '',
  to_email: data?.to_email ?? '',
  host: data?.host ?? '',
  port: data?.port ?? '',
  secure: data?.secure ?? false,
  pgpEncryptEnabled: data?.pgpEncryptEnabled ?? false,
  pgpPublicKey: data?.pgpPublicKey ?? '',
})

export default defineComponent({
  setup () {
    // Template refers to these values which are bound to the contract type
    // Cant constrain library props, they are controlled by the library
    const strTrue: StringBoolean = 'true'
    const strFalse: StringBoolean = 'false'
    return { v$: useVuelidate(), strTrue, strFalse }
  },
  data (): { form: EmailForm; saveEmailSettingsAttempted: boolean; showProfile: boolean; profiles: Profile[] } {
    return {
      form: toEmailForm(),
      saveEmailSettingsAttempted: false,
      showProfile: false,
      profiles: []
    }
  },
  validations () {
    return {
      form: {
        email: {required},
        sender_email: {required, email},
        password: {required},
        to_email: {required, email},
        host: {required},
        port: {required},
        // PGP key is required only when encryption is enabled — mirrors the server (which rejects enabling PGP with no
        // key), so submit blocks client-side instead of relying on the backend 400.
        pgpPublicKey: { required: requiredIf(() => this.form.pgpEncryptEnabled) }
      }
    }
  },
  mounted () {
    this.getEmailSetting()
  },
  methods: {
    handleSubmit () {
      // todo: this never goes to false. Is it necessary? Or does the component just unmount and discard state.
      this.saveEmailSettingsAttempted = true
      this.v$.$touch()
      if (this.v$.$invalid) {
        return
      }
      this.$put<SaveEmailSettingsResponse>('email/setting', this.form)
        .then((response) => {
          if (response) {
            notifySuccess('Setting saved successfully', 'Email Setting')
            this.getEmailSetting()
          }
        })
        .catch((e) => console.error(e))
    },
    getEmailSetting () {
      this.$get<EmailSettingsResponse>('email/setting')
        .then((response) => {
          if (response && response.data) {
            this.form = toEmailForm(response.data)
            this.showProfile = true
            this.getProfiles()
          } else {
            this.form = toEmailForm()
          }
        })
        .catch((e) => {
          console.error(e)
        })
    },
    getProfiles () {
      this.$post<ProfilesResponse>('profile/getdata', {})
        .then((response) => {
          if (response) {
            this.profiles = response.data
          }
        })
        .catch((e) => {
          console.error(e)
        })
    },
    profileUpdate (status: unknown, id: string) {
      // `$event` from the BVN checkbox is a wide union (CheckboxValue); narrow to the StringBoolean the API expects.
      const value: StringBoolean = status === 'true' ? 'true' : 'false'
      this.$patch<SaveEmailSettingResponse>('email/notification', { setting_id: id, status: value })
        .then((response) => {
          // API plugin potentially sets response to `false`
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

