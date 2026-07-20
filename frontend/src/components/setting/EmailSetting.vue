<template>
  <div class="p-1">
    <form class="ml-2 mr-2" @submit.prevent="saveEmailSetting">
      <div class="form-group mt-2">
        <input v-model="r$.$value.email" class="form-control" placeholder="Enter Email" :class="{ 'is-invalid': r$.email.$error }">
        <FieldErrors :field="r$.email" />
      </div>
      <div class="form-group mt-2">
        <input v-model="r$.$value.password" class="form-control" placeholder="Enter Password" :class="{ 'is-invalid': r$.password.$error }">
        <FieldErrors :field="r$.password" />
      </div>
      <div class="form-group mt-2">
        <input v-model="r$.$value.sender_email" class="form-control" placeholder="Email FROM" :class="{ 'is-invalid': r$.sender_email.$error }">
        <FieldErrors :field="r$.sender_email" />
      </div>
      <div class="form-group mt-2">
        <input v-model="r$.$value.to_email" class="form-control" placeholder="Email TO" :class="{ 'is-invalid': r$.to_email.$error }">
        <FieldErrors :field="r$.to_email" />
      </div>
      <div class="form-group mt-2">
        <input v-model="r$.$value.host" class="form-control" placeholder="Enter Host (smtp.domain.com)" :class="{ 'is-invalid': r$.host.$error }">
        <FieldErrors :field="r$.host" />
      </div>
      <div class="form-group mt-2">
        <input v-model="r$.$value.port" class="form-control" placeholder="Enter Port (465 or 587)" :class="{ 'is-invalid': r$.port.$error }">
        <FieldErrors :field="r$.port" />
      </div>
      <div class="form-group mt-2">
        <b-form-checkbox v-model="r$.$value.secure" v-b-tooltip.hover.bottomright="'for 465 only'" plain> Secure </b-form-checkbox>
      </div>
      <div class="form-group mt-2">
        <textarea
          v-model="r$.$value.pgpPublicKey"
          class="form-control"
          placeholder="-----BEGIN PGP PUBLIC KEY BLOCK-----..."
          :class="{ 'is-invalid': r$.pgpPublicKey.$error }"
        >
        </textarea>
        <FieldErrors :field="r$.pgpPublicKey" />
      </div>
      <div class="form-group mt-2">
        <b-form-checkbox v-model="r$.$value.pgpEncryptEnabled" v-b-tooltip.hover.bottomright="'for PGP encrypted emails'" plain>
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
        <b-form-checkbox
          v-for="profile in profileStore.profiles"
          :key="profile._id"
          :name="'checkbox-' + profile._id"
          :model-value="profile.emailnotification"
          @update:model-value="profileUpdate($event, profile._id)"
        >
          <span class="pr-2">&nbsp;&nbsp;{{ profile.profile }}</span>
        </b-form-checkbox>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRegle } from '@regle/core'
import { required, email, requiredIf, withMessage } from '@regle/rules'
import type { EmailCreateRequest } from '@shared/contracts/email.ts'
import type { EmailDoc } from '@shared/schema/email.ts'
import type { CheckboxValue } from 'bootstrap-vue-next'
import { client, request } from '@/core/rpc.client.ts'
import { notifySuccess } from '@/core/notify.ts'
import { useProfileStore } from '@/stores/profile.ts'

/**
 * Build a full form from a (partial or absent) saved document -- reused for init, load, and reset. The form is exactly
 * the create-request body (`EmailCreateRequest`), so it feeds straight into the `$put`. A present doc has every field
 * non-null thanks to the tightened schema, so only `pgpPublicKey` (the one nullable field) needs a `?? ''` fallback;
 * absent data short-circuits to a blank form.
 */
const toEmailForm = (data?: EmailDoc | null): EmailCreateRequest => {
  if (!data) {
    return { email: '', sender_email: '', password: '', to_email: '', host: '', port: '', secure: false, pgpEncryptEnabled: false, pgpPublicKey: '' }
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

const profileStore = useProfileStore()
const formState = ref(toEmailForm())
const showProfile = ref(false)
const { r$ } = useRegle(formState, {
  email: { required: withMessage(required, 'Email Is Required') },
  sender_email: { required: withMessage(required, 'FROM Email is required'), email: withMessage(email, 'Enter Valid FROM Email') },
  password: { required: withMessage(required, 'Password Is Required') },
  to_email: { required: withMessage(required, 'TO Email is required'), email: withMessage(email, 'Enter Valid TO Email') },
  host: { required: withMessage(required, 'Host Is Required') },
  port: { required: withMessage(required, 'Port Is Required') },
  // PGP key is required only when encryption is enabled -- mirrors the server (which rejects enabling PGP with
  // no key), so submit blocks client-side instead of relying on the backend 400.
  pgpPublicKey: {
    required: withMessage(
      requiredIf(() => formState.value.pgpEncryptEnabled),
      'Public PGP Key Required',
    ),
  },
})

async function saveEmailSetting() {
  const { valid } = await r$.$validate()
  if (!valid) return
  // Send the full form (every field present) rather than $validate's output, which marks rule-less fields optional.
  await request(client.api.email.$put({ json: formState.value }))
  r$.$reset()
  void notifySuccess('Setting saved successfully', 'Email Setting')
  showProfile.value = true
}

async function getEmailSetting() {
  const { data } = await request(client.api.email.$get())
  formState.value = toEmailForm(data)
  r$.$reset() // Re-baseline the loaded values as the form's initial state.
  if (data) showProfile.value = true
}

async function profileUpdate(value: CheckboxValue | undefined, id: string) {
  // CheckboxValue is a wide union
  await request(client.api.setting[':id'].notification.$patch({ param: { id }, json: { status: value === true } }))
  // The checkbox is controlled by the store value, so refresh it -- otherwise it snaps back to the pre-toggle state.
  // @update:model-value handler is fire-and-forget, not waiting for this promise so no need to await this
  void profileStore.loadProfiles()
}

onMounted(getEmailSetting)
</script>
