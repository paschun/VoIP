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
                <!-- Disable until valid AND actually changed: $invalid checks validity, $anyEdited checks change vs the
                     post-load baseline ($reset re-baselines on load). $correct is unfit -- it keys off $dirty (any
                     interaction), not $edited, so it would enable Save after an edit-and-revert (re-saving unchanged
                     data), and its "not empty" clause is murky for the optional fields. -->
                <button class="btn btn-success mt-2" type="submit" :disabled="r$.$invalid || !r$.$anyEdited">Save</button>
            </div>
        </form>
        <hr>
        <div v-if="showProfile">
          <div class="form-group mt-2">
            <b-form-checkbox v-for="profile in profileStore.profiles" :key="profile._id"
              :name="'checkbox-' + profile._id"
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
import type { CheckboxValue } from 'bootstrap-vue-next'
import { useRegle } from '@regle/core'
import { required, email, requiredIf, withMessage } from '@regle/rules'
import { useProfileStore } from '@/stores/profile.ts'
import { client, request } from '@/core/rpc.client.ts'
import { notifySuccess } from '@/notify.ts'
import type { EmailCreateRequest } from '@shared/contracts/email.ts'
import type { EmailDoc } from '@shared/schema/email.ts'

/**
 * Build a full form from a (partial or absent) saved document -- reused for init, load, and reset. The form is exactly
 * the create-request body (`EmailCreateRequest`), so it feeds straight into the `$put`. A present doc has every field
 * non-null thanks to the tightened schema, so only `pgpPublicKey` (the one nullable field) needs a `?? ''` fallback;
 * absent data short-circuits to a blank form.
 */
const toEmailForm = (data?: EmailDoc | null): EmailCreateRequest => {
  if (!data) {
    return { email: '', sender_email: '', password: '', to_email: '', host: '', port: '',
             secure: false, pgpEncryptEnabled: false, pgpPublicKey: '' }
  }
  return {
    email: data.email,
    sender_email: data.sender_email,
    password: data.password,
    to_email: data.to_email,
    host: data.host,
    port: data.port,
    secure: data.secure,
    pgpEncryptEnabled: data.pgpEncryptEnabled,
    pgpPublicKey: data.pgpPublicKey ?? '',
  }
}

export default defineComponent({
  setup () {
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
    return { r$, formState, profileStore: useProfileStore() }
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
      const { valid } = await this.r$.$validate()
      if (!valid) return
      // Send the full form (every field present) rather than $validate's output, which marks rule-less fields optional.
      await request(client.api.email.$put({ json: this.formState }))
      this.r$.$reset()
      notifySuccess('Setting saved successfully', 'Email Setting')
      this.showProfile = true
    },
    async getEmailSetting () {
      const { data } = await request(client.api.email.$get())
      this.formState = toEmailForm(data)
      this.r$.$reset() // Re-baseline the loaded values as the form's initial state.
      if (data) this.showProfile = true
    },
    async profileUpdate (value: CheckboxValue | undefined, id: string) {
      // CheckboxValue is a wide union
      await request(client.api.setting[':id'].notification.$patch({ param: { id }, json: { status: value === true } }))
      // The checkbox is controlled by the store value, so refresh it -- otherwise it snaps back to the pre-toggle state.
      // @update:model-value handler is fire-and-forget, not waiting for this promise so no need to await this
      void this.profileStore.loadProfiles()
    }
  }
})
</script>
