<template>
  <div>
    <loading-spinner :show="isSavingProviderSetting" />
    <b-modal v-model="visible" size="lg" title="Settings" hide-footer>
      <theme-button />
      <form class="ml-2 mr-2" @submit.prevent="saveProviderSetting">
        <b-form-radio-group
          id="provider-type-radios"
          v-model="r$.$value.type"
          :options="options"
          button-variant="outline-primary"
          size="lg"
          name="radio-btn-outline"
          buttons
        ></b-form-radio-group>
        <div class="card form-group mt-4">
          <div class="card-body">
            <div class="row m-auto">
              <div class="col-auto m-auto mb-1 mb-sm-auto">
                <label>
                  <i-bi-person-fill aria-hidden="true" />
                  Profile
                </label>
              </div>
              <div class="col-sm m-auto col-10">
                <span class="form-control-plaintext">{{ profileStore.activeProfile?.profile }}</span>
              </div>
              <div class="col-1 m-auto">
                <span class="float-right" style="cursor: pointer" title="Delete">
                  <i-bi-trash style="font-size: 1.5em" aria-hidden="true" @click="deleteProfile()" />
                </span>
              </div>
            </div>
          </div>
        </div>
        <div v-if="r$.$value.type === 'telnyx'" class="card form-group mt-4 overflow-visible-card">
          <div class="card-body">
            <div class="row mb-2">
              <div class="col-auto m-auto">
                <label>
                  <i-bi-key aria-hidden="true" />
                  <b>Telnyx</b> API Key
                </label>
              </div>
              <div class="col-sm col-12 m-auto">
                <input v-model="r$.$value.api_key" class="form-control" type="text" placeholder="Telnyx API Key" :class="{ 'is-invalid': r$.api_key.$error }">
                <field-errors :field="r$.api_key" />
              </div>
            </div>
            <div class="row mb-2">
              <div class="col-auto m-auto">
                <button id="get-number" class="btn btn-secondary btn-sm" type="button" @click="loadProviderNumbers('telnyx')">
                  <i-bi-telephone-plus aria-hidden="true" />
                  Get Number
                </button>
              </div>
              <div class="col col-lg-6 m-auto">
                <div class="form-group">
                  <custom-autocomplete-select
                    v-model="r$.$value.number"
                    :options="telnyxNumbers"
                    label-prop="phone_number"
                    value-prop="phone_number"
                  ></custom-autocomplete-select>
                  <field-errors :field="r$.number" />
                </div>
              </div>
              <div class="col-auto m-auto">
                <span v-if="showDelete" class="float-right" style="cursor: pointer" title="Delete" @click="deleteApiKey()">
                  <i-bi-trash style="font-size: 1.5em" aria-hidden="true" />
                </span>
              </div>
            </div>
          </div>
        </div>
        <div v-if="r$.$value.type === 'twilio'" class="card form-group mt-4 overflow-visible-card">
          <div class="card-body">
            <div class="row mb-2">
              <div class="col-auto col-lg-3 m-auto">
                <label>
                  <i-bi-key aria-hidden="true" />
                  <b>Twilio</b> SID
                </label>
              </div>
              <div class="col-12 col-sm col-lg-9 m-auto">
                <input
                  v-model="r$.$value.twilio_sid"
                  class="form-control"
                  type="text"
                  placeholder="Twilio SID"
                  :class="{ 'is-invalid': r$.twilio_sid.$error }"
                >
                <field-errors :field="r$.twilio_sid" />
              </div>
            </div>

            <div class="row mb-2">
              <div class="col-auto col-lg-3 m-auto">
                <label>
                  <i-bi-key aria-hidden="true" />
                  <b>Twilio</b> Token
                </label>
              </div>
              <div class="col-12 col-sm col-lg-9 m-auto">
                <input
                  v-model="r$.$value.twilio_token"
                  class="form-control"
                  type="text"
                  placeholder="Twilio Token"
                  :class="{ 'is-invalid': r$.twilio_token.$error }"
                >
                <field-errors :field="r$.twilio_token" />
              </div>
            </div>
            <div class="row mb-2">
              <div class="col-auto m-auto">
                <button id="get-number-twilio" class="btn btn-secondary btn-sm" type="button" @click="loadProviderNumbers('twilio')">
                  <i-bi-telephone-plus aria-hidden="true" />
                  Get Number
                </button>
              </div>
              <div class="col col-lg-6 m-auto">
                <div class="form-group">
                  <custom-autocomplete-select
                    v-model="r$.$value.twilio_number"
                    :options="twilioNumbers"
                    label-prop="phoneNumber"
                    value-prop="phoneNumber"
                  ></custom-autocomplete-select>
                  <field-errors :field="r$.twilio_number" />
                </div>
              </div>
              <div class="col-auto m-auto">
                <span v-if="showDelete" class="float-right" style="cursor: pointer" title="Delete" @click="deleteApiKey()">
                  <i-bi-trash style="font-size: 1.5em" aria-hidden="true" />
                </span>
              </div>
            </div>
          </div>
        </div>
        <div class="d-grid d-md-flex">
          <button class="btn btn-success mt-4 submit-btn" type="submit">Save</button>
        </div>
      </form>
    </b-modal>
  </div>
</template>

<script setup lang="ts">
/**
 * The telnyx/twilio provider settings modal, opened from SettingsPanel's "Profile Settings" entry via `open()`
 * (exposed because opening has a precondition: it toasts and bails when there's no active profile).
 * Configure-only: it edits the active profile's provider config; profile create/select lives in ProfileDropdown.
 */
import { computed, ref, watch } from 'vue'
import { useRegle, createVariant } from '@regle/core'
import { required, literal, withMessage } from '@regle/rules'
import Swal from 'sweetalert2'
import FieldErrors from '@/components/shared/FieldErrors.vue'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'
import ThemeButton from '@/components/shared/ThemeButton.vue'
import { getProviderNumbers, lookupNumber, type ProviderNumbers } from '@/core/services/provider.ts'
import { confirmDelete } from '@/helper.ts'
import { notifyInfo, notifySuccess } from '@/core/notify.ts'
import { useProfileStore, type ProviderSettingPayload } from '@/stores/profile.ts'
import CustomAutocompleteSelect from './CustomAutocompleteSelect.vue'

/**
 * The fields edited in the settings modal (the profile name and server-side identifiers are added at submit). Both
 * providers' fields coexist so toggling the radio preserves entries; submit narrows to the active variant.
 */
type ProviderSettingForm = {
  type: ProviderSettingPayload['type']
  api_key: string
  number: string
  twilio_sid: string
  twilio_token: string
  twilio_number: string
}
/** A purchasable Telnyx number from the provider-numbers lookup (`id` is the lookup's sid). */
type TelnyxNumber = Extract<ProviderNumbers, { type: 'telnyx' }>['numbers'][number]
/** A purchasable Twilio number from the provider-numbers lookup. */
type TwilioNumber = Extract<ProviderNumbers, { type: 'twilio' }>['numbers'][number]

const options: { text: string; value: ProviderSettingForm['type'] }[] = [
  { text: 'Telnyx', value: 'telnyx' },
  { text: 'Twilio', value: 'twilio' },
]

const profileStore = useProfileStore()
const visible = ref(false)
const form = ref<ProviderSettingForm>({
  type: 'telnyx',
  api_key: '',
  number: '',
  twilio_sid: '',
  twilio_token: '',
  twilio_number: '',
})
const { r$ } = useRegle(form, () => {
  const provider = createVariant(form, 'type', [
    {
      type: { literal: literal('telnyx') },
      api_key: { required: withMessage(required, 'API Key is required') },
      number: { required: withMessage(required, 'Number is required') },
    },
    {
      type: { literal: literal('twilio') },
      twilio_sid: { required: withMessage(required, 'Twilio sid is required') },
      twilio_token: { required: withMessage(required, 'Twilio token is required') },
      twilio_number: { required: withMessage(required, 'Number is required') },
    },
  ])
  return { ...provider.value }
})

const isSavingProviderSetting = ref(false) // covers both legs: the number-lookup and the save itself
const telnyxNumbers = ref<TelnyxNumber[]>([])
const twilioNumbers = ref<TwilioNumber[]>([])

/** The active profile has provider creds saved, so the delete-key icon applies. */
const showDelete = computed(() => {
  const p = profileStore.activeProfile
  if (!p) return false
  return p.type === 'telnyx' ? !!p.api_key : !!p.twilio_sid
})

function open() {
  if (!profileStore.hasActiveProfile) {
    void notifyInfo('Create a profile first')
    return
  }
  visible.value = true
}
defineExpose({ open })

/** Copy the active profile's saved settings into the form and load its provider's purchasable numbers. */
function seedFormFromActiveProfile() {
  const profile = profileStore.activeProfile
  if (!profile) return
  form.value = {
    type: profile.type,
    api_key: profile.api_key ?? '',
    number: profile.number ?? '',
    twilio_sid: profile.twilio_sid ?? '',
    twilio_token: profile.twilio_token ?? '',
    twilio_number: profile.number ?? '',
  }
  void loadProviderNumbers(profile.type)
}

async function deleteProfile() {
  if (!(await confirmDelete('Do you want to delete this Profile?', 'Profile not deleted'))) return
  // Deletes, clears the selection, and reloads the profile list.
  await profileStore.deleteActiveProfile()
  void notifySuccess('Profile deleted successfully!')
  r$.$reset({ toOriginalState: true }) // reset to empty
  telnyxNumbers.value = []
  twilioNumbers.value = []
  visible.value = false
  // deleteActiveProfile already reloaded the list, so the next selection is available now.
  const next = profileStore.profiles[0]
  if (next) profileStore.setActiveProfile(next)
}

async function deleteApiKey() {
  if (!(await confirmDelete('Do you want to delete this setting?', 'setting not deleted'))) return
  await profileStore.deleteProviderSetting()
  void notifySuccess('Key deleted successfully!')
  // The modal stays open on the (still-existing) profile, now with blank provider fields.
  form.value = { ...form.value, api_key: '', number: '', twilio_sid: '', twilio_token: '', twilio_number: '' }
  telnyxNumbers.value = []
  twilioNumbers.value = []
}

/**
 * Fetch the provider's available numbers into the matching autocomplete list, using the creds in the form.
 * The route requires non-empty creds, so skip the call (leaving the list empty) until they're filled in.
 */
async function loadProviderNumbers(type: 'telnyx' | 'twilio') {
  const v = r$.$value
  if (type === 'telnyx') {
    telnyxNumbers.value = []
    if (!v.api_key) return
    const data = await getProviderNumbers({ type: 'telnyx', api_key: v.api_key })
    if (data.type !== 'telnyx') throw new Error('backend returned wrong number type')
    telnyxNumbers.value = data.numbers
  } else {
    twilioNumbers.value = []
    if (!v.twilio_sid || !v.twilio_token) return
    const data = await getProviderNumbers({ type: 'twilio', twilio_sid: v.twilio_sid, twilio_token: v.twilio_token })
    if (data.type !== 'twilio') throw new Error('backend returned wrong number type')
    twilioNumbers.value = data.numbers
  }
}

async function saveProviderSetting() {
  // dont use validated `data`: createVariant types its provider fields as MaybeOutput<string>, not string.
  const { valid } = await r$.$validate()
  if (!valid) return
  const activeProfile = profileStore.activeProfile
  if (!activeProfile) return // open() gates on this; re-checked for type narrowing
  // r$.$value is reactive and the awaits below give the user a window to edit the form, so grab a snapshot
  const { type, api_key, number, twilio_sid, twilio_token, twilio_number } = r$.$value
  const base = { setting: profileStore.activeProfileId, profile: activeProfile.profile ?? '', override: true }
  const providerSettingPayload: ProviderSettingPayload =
    type === 'telnyx'
      ? { ...base, type, api_key, number, sid: telnyxNumbers.value.find((n) => n.phone_number === number)?.id ?? '' }
      : {
          ...base,
          type,
          twilio_sid,
          twilio_token,
          twilio_number,
          sid: twilioNumbers.value.find((n) => n.phoneNumber === twilio_number)?.sid ?? '',
        }
  isSavingProviderSetting.value = true
  let isCall = false
  try {
    // a configured call webhook means call routing already exists, so we prompt before overriding it.
    if (providerSettingPayload.type === 'telnyx') {
      const data = await lookupNumber({
        type: 'telnyx',
        api_key: providerSettingPayload.api_key,
        number: providerSettingPayload.number,
        sid: providerSettingPayload.sid,
      })
      isCall = !!data.connection_id
    } else {
      const data = await lookupNumber({
        type: 'twilio',
        twilio_sid: providerSettingPayload.twilio_sid,
        twilio_token: providerSettingPayload.twilio_token,
        twilio_number: providerSettingPayload.twilio_number,
        sid: providerSettingPayload.sid,
      })
      isCall = !!data.voiceApplicationSid || !!data.voiceUrl
    }
  } finally {
    isSavingProviderSetting.value = false
  }
  // Prompt outside the loader block (matching the old fire-and-forget swal that ran after `finally`).
  if (isCall) {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Call Setting',
      text: 'The call setting is already available. Do you want to override the call setting?',
      showDenyButton: true,
      confirmButtonText: 'Yes, override it',
      denyButtonText: `No, Keep old`,
    })
    if (!result.isConfirmed && !result.isDenied) return
    providerSettingPayload.override = result.isConfirmed
  }
  await createProviderSetting(providerSettingPayload)
}

async function createProviderSetting(providerSettingPayload: ProviderSettingPayload) {
  isSavingProviderSetting.value = true
  try {
    await profileStore.saveProviderSetting(providerSettingPayload)
    visible.value = false
    r$.$reset() // just-saved values are the new baseline
  } finally {
    isSavingProviderSetting.value = false
  }
}

// Selection changed: reseed the form for the new profile. Gating on the id (not activeProfile) keeps a same-id
// detail refresh from clobbering in-progress form edits. immediate so a profile persisted in localStorage seeds
// on mount -- its id doesn't "change".
watch(() => profileStore.activeProfileId, seedFormFromActiveProfile, { immediate: true })
</script>

<style scoped>
.overflow-visible-card {
  overflow: visible;
}
</style>

<!-- BModal internals are teleported, so this button-group rule can't be scoped. -->
<style>
#provider-type-radios > label > input {
  margin-right: 0.6rem;
}
</style>
