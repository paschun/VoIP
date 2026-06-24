<template>
    <div class="p-1">
        <form @submit.prevent="saveEmailSetting" class="ml-2 mr-2">
           <div class="form-group mt-2">
                <input class="form-control" v-model="r$.$value.email" placeholder="Enter Email" :class="{ 'is-invalid': r$.email.$error }" />
                <div v-if="r$.email.$error" class="invalid-feedback">
                    <span v-for="error of r$.$errors.email" :key="error">{{ error }}</span>
                </div>
            </div>
            <div class="form-group mt-2">
                <input class="form-control" v-model="r$.$value.password" placeholder="Enter Password" :class="{ 'is-invalid': r$.password.$error }" />
                <div v-if="r$.password.$error" class="invalid-feedback">
                    <span v-for="error of r$.$errors.password" :key="error">{{ error }}</span>
                </div>
            </div>
             <div class="form-group mt-2">
                <input class="form-control" v-model="r$.$value.sender_email" placeholder="Email FROM" :class="{ 'is-invalid': r$.sender_email.$error }" />
                <div v-if="r$.sender_email.$error" class="invalid-feedback">
                    <span v-for="error of r$.$errors.sender_email" :key="error">{{ error }}</span>
                </div>
            </div>
             <div class="form-group mt-2">
                <input class="form-control" v-model="r$.$value.to_email" placeholder="Email TO" :class="{ 'is-invalid': r$.to_email.$error }" />
                <div v-if="r$.to_email.$error" class="invalid-feedback">
                    <span v-for="error of r$.$errors.to_email" :key="error">{{ error }}</span>
                </div>
            </div>
            <div class="form-group mt-2">
                <input class="form-control" v-model="r$.$value.host" placeholder="Enter Host (smtp.domain.com)" :class="{ 'is-invalid': r$.host.$error }" />
                <div v-if="r$.host.$error" class="invalid-feedback">
                    <span v-for="error of r$.$errors.host" :key="error">{{ error }}</span>
                </div>
            </div>
            <div class="form-group mt-2">
                <input class="form-control" v-model="r$.$value.port" placeholder="Enter Port (465 or 587)" :class="{ 'is-invalid': r$.port.$error }" />
                <div v-if="r$.port.$error" class="invalid-feedback">
                    <span v-for="error of r$.$errors.port" :key="error">{{ error }}</span>
                </div>
            </div>
            <div class="form-group mt-2">
               <b-form-checkbox v-model="r$.$value.secure" plain v-b-tooltip.hover.bottomright="'for 465 only'">
                Secure
              </b-form-checkbox>
            </div>
            <div class="form-group mt-2">
              <textarea class="form-control" v-model="r$.$value.pgpPublicKey" placeholder="-----BEGIN PGP PUBLIC KEY BLOCK-----..." :class="{ 'is-invalid': r$.pgpPublicKey.$error }">
              </textarea>
              <div v-if="r$.pgpPublicKey.$error" class="invalid-feedback">
                    <span v-for="error of r$.$errors.pgpPublicKey" :key="error">{{ error }}</span>
                </div>
            </div>
            <div class="form-group mt-2">
              <b-form-checkbox v-model="r$.$value.pgpEncryptEnabled" plain v-b-tooltip.hover.bottomright="'for PGP encrypted emails'">
                Encrypt with PGP
              </b-form-checkbox>
            </div>
            <div class="form-group">
                <!-- Disable until valid AND changed: $invalid checks validity, $anyEdited checks change-since-load.
                     $correct is unfit -- it conflates valid with merely-dirty (load marks it dirty), so it would both
                     allow re-saving unchanged data and block a valid form the user hasn't touched. -->
                <button class="btn btn-success mt-2" type="submit" :disabled="r$.$invalid || !r$.$anyEdited">Save</button>
            </div>
        </form>
        <hr>
        <div v-if="showProfile">
          <div class="form-group mt-2">
            <b-form-checkbox v-for="profile in profileStore.profiles" :key="profile._id"
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
import { defineComponent, ref } from 'vue'
import { useRegle } from '@regle/core'
import { required, email, requiredIf, withMessage } from '@regle/rules'
import { useProfileStore } from '@/stores/profile.ts'
import { notifySuccess } from '@/notify.ts'
import type { StringBoolean } from '@shared/api-contracts.ts'
import type { EmailDoc } from '@shared/schema/email.ts'
import type { EmailSettingsResponse, SaveEmailSettingsResponse, SaveEmailSettingResponse } from '@shared/contracts/email.ts'

/** The editable subset of the Email document the form lets the user change (a frontend concern, not a wire contract). */
type EmailFields = Pick<EmailDoc,
  'email' | 'sender_email' | 'password' | 'to_email' | 'host' | 'port' | 'secure' | 'pgpEncryptEnabled' | 'pgpPublicKey'>

/**
 * Form/binding shape, derived from `EmailFields` so it tracks the schema. `-?` makes every field present (v-model needs
 * it) and `NonNullable` strips `| null | undefined`, so `email?: string | null` becomes `email: string`.
 */
type EmailForm = { [K in keyof EmailFields]-?: NonNullable<EmailFields[K]> }

/** Build a full, non-null form from a (partial or absent) saved document -- reused for init, load, and reset. */
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
    // BVN checkbox values are this contract's `'true' | 'false'`, not a JS boolean; its prop types can't be constrained.
    const strTrue: StringBoolean = 'true'
    const strFalse: StringBoolean = 'false'
    const formState = ref(toEmailForm())
    const { r$ } = useRegle(formState, {
      email: { required: withMessage(required, 'Email Is Required') },
      sender_email: { required: withMessage(required, 'FROM Email is required'), email: withMessage(email, 'Enter Valid FROM Email') },
      password: { required: withMessage(required, 'Password Is Required') },
      to_email: { required: withMessage(required, 'TO Email is required'), email: withMessage(email, 'Enter Valid TO Email') },
      host: { required: withMessage(required, 'Host Is Required') },
      port: { required: withMessage(required, 'Port Is Required') },
      // PGP key is required only when encryption is enabled -- mirrors the server (which rejects enabling PGP with
      // no key), so submit blocks client-side instead of relying on the backend 400.
      pgpPublicKey: { required: withMessage(requiredIf(() => formState.value.pgpEncryptEnabled), 'Public PGP Key Required') }
    })
    return { r$, formState, strTrue, strFalse, profileStore: useProfileStore() }
  },
  data (): { showProfile: boolean } {
    return {
      showProfile: false
    }
  },
  mounted () {
    this.getEmailSetting()
  },
  methods: {
    async saveEmailSetting () {
      const { valid, data } = await this.r$.$validate()
      if (!valid) return
      try {
        const response = await this.$put<SaveEmailSettingsResponse>('email/setting', data)
        if (response) {
          notifySuccess('Setting saved successfully', 'Email Setting')
          this.getEmailSetting()
        }
      } catch (e) {
        console.error(e)
      }
    },
    getEmailSetting () {
      this.$get<EmailSettingsResponse>('email/setting')
        .then((response) => {
          if (response && response.data) {
            this.formState = toEmailForm(response.data)
            this.showProfile = true
            void this.profileStore.loadProfiles()
          } else {
            this.formState = toEmailForm()
          }
          // Re-baseline the loaded values as the form's initial state so Save stays disabled until the user actually
          // changes something ($anyEdited compares against this baseline, not the blank original).
          this.r$.$reset()
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
            void this.profileStore.loadProfiles()
          }
        })
        .catch((e) => {
          console.error(e)
        })
    }
  }
})
</script>
