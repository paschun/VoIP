<template>
  <div>
    <loading-spinner :show="isSavingProviderSetting" />
    <b-modal ref="modal" size="lg" title="Settings" hide-footer>
      <theme-button id-hide="false" />
      <form @submit.prevent="saveProviderSetting" class="ml-2 mr-2">
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
                  <i-bi-trash @click="deleteProfile()" style="font-size: 1.5em" aria-hidden="true" />
                </span>
              </div>
            </div>
          </div>
        </div>
        <div class="card form-group mt-4 overflow-visible-card" v-if="r$.$value.type === 'telnyx'">
          <div class="card-body">
            <div class="row mb-2">
              <div class="col-auto m-auto">
                <label>
                  <i-bi-key aria-hidden="true" />
                  <b>Telnyx</b> API Key
                </label>
              </div>
              <div class="col-sm col-12 m-auto">
                <input class="form-control" type="text" placeholder="Telnyx API Key" v-model="r$.$value.api_key" :class="{ 'is-invalid': r$.api_key.$error }" />
                <field-errors :field="r$.api_key" />
              </div>
            </div>
            <div class="row mb-2">
              <div class="col-auto m-auto">
                <button class="dark-mode btn btn-secondary btn-sm" type="button" id="get-number" @click="loadProviderNumbers('telnyx')">
                  <i-bi-telephone-plus aria-hidden="true" />
                  Get Number
                </button>
              </div>
              <div class="col col-lg-6 m-auto">
                <div class="form-group">
                  <custom-autocomplete-select
                    v-model="r$.$value.number"
                    :options="telnyxNumbers"
                    labelProp="phone_number"
                    valueProp="phone_number"
                  ></custom-autocomplete-select>
                  <field-errors :field="r$.number" />
                </div>
              </div>
              <div class="col-auto m-auto">
                <span class="float-right" style="cursor: pointer" @click="deleteApiKey()" title="Delete" v-if="showDelete">
                  <i-bi-trash style="font-size: 1.5em" aria-hidden="true" />
                </span>
              </div>
            </div>
          </div>
        </div>
        <div class="card form-group mt-4 overflow-visible-card" v-if="r$.$value.type === 'twilio'">
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
                  class="form-control"
                  type="text"
                  placeholder="Twilio SID"
                  v-model="r$.$value.twilio_sid"
                  :class="{ 'is-invalid': r$.twilio_sid.$error }"
                />
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
                  class="form-control"
                  type="text"
                  placeholder="Twilio Token"
                  v-model="r$.$value.twilio_token"
                  :class="{ 'is-invalid': r$.twilio_token.$error }"
                />
                <field-errors :field="r$.twilio_token" />
              </div>
            </div>
            <div class="row mb-2">
              <div class="col-auto m-auto">
                <button class="dark-mode btn btn-secondary btn-sm" type="button" id="get-number-twilio" @click="loadProviderNumbers('twilio')">
                  <i-bi-telephone-plus aria-hidden="true" />
                  Get Number
                </button>
              </div>
              <div class="col col-lg-6 m-auto">
                <div class="form-group">
                  <custom-autocomplete-select
                    v-model="r$.$value.twilio_number"
                    :options="twilioNumbers"
                    labelProp="phoneNumber"
                    valueProp="phoneNumber"
                  ></custom-autocomplete-select>
                  <field-errors :field="r$.twilio_number" />
                </div>
              </div>
              <div class="col-auto m-auto">
                <span class="float-right" style="cursor: pointer" @click="deleteApiKey()" title="Delete" v-if="showDelete">
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

<script lang="ts">
/**
 * The telnyx/twilio provider settings modal, opened from Setting.vue's "Profile Settings" entry via `open()`.
 * Configure-only: it edits the active profile's provider config; profile create/select lives in ProfileDropdown.
 */
import { defineComponent, ref, useTemplateRef } from 'vue'
import { useRegle, createVariant } from '@regle/core'
import { required, literal, withMessage } from '@regle/rules'
import type { BModal } from 'bootstrap-vue-next'
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

export default defineComponent({
  name: 'ProviderSettingModal',
  components: { LoadingSpinner, ThemeButton, CustomAutocompleteSelect, FieldErrors },
  setup() {
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
    const modal = useTemplateRef<InstanceType<typeof BModal>>('modal')
    return { r$, form, profileStore: useProfileStore(), modal }
  },
  data(): {
    isSavingProviderSetting: boolean
    telnyxNumbers: TelnyxNumber[]
    twilioNumbers: TwilioNumber[]
    options: { text: string; value: ProviderSettingForm['type'] }[]
  } {
    return {
      isSavingProviderSetting: false, // covers both legs: the number-lookup and the save itself
      telnyxNumbers: [],
      twilioNumbers: [],
      options: [
        { text: 'Telnyx', value: 'telnyx' },
        { text: 'Twilio', value: 'twilio' },
      ],
    }
  },
  computed: {
    /** The active profile has provider creds saved, so the delete-key icon applies. */
    showDelete(): boolean {
      const p = this.profileStore.activeProfile
      if (!p) return false
      return p.type === 'telnyx' ? !!p.api_key : !!p.twilio_sid
    },
  },
  watch: {
    // Selection changed: reseed the form for the new profile. Gating on the id (not activeProfile) keeps a same-id
    // detail refresh from clobbering in-progress form edits. immediate so a profile persisted in localStorage seeds
    // on mount -- its id doesn't "change".
    'profileStore.activeProfileId': {
      immediate: true,
      handler() {
        this.seedFormFromActiveProfile()
      },
    },
  },
  methods: {
    open() {
      if (!this.profileStore.hasActiveProfile) {
        void notifyInfo('Create a profile first')
        return
      }
      this.modal?.show()
    },
    /** Copy the active profile's saved settings into the form and load its provider's purchasable numbers. */
    seedFormFromActiveProfile() {
      const profile = this.profileStore.activeProfile
      if (!profile) return
      this.form = {
        type: profile.type,
        api_key: profile.api_key ?? '',
        number: profile.number ?? '',
        twilio_sid: profile.twilio_sid ?? '',
        twilio_token: profile.twilio_token ?? '',
        twilio_number: profile.number ?? '',
      }
      this.loadProviderNumbers(profile.type)
    },
    async deleteProfile() {
      if (!(await confirmDelete('Do you want to delete this Profile?', 'Profile not deleted'))) return
      // Deletes, clears the selection, and reloads the profile list.
      await this.profileStore.deleteActiveProfile()
      notifySuccess('Profile deleted successfully!')
      this.r$.$reset({ toOriginalState: true }) // reset to empty
      this.telnyxNumbers = []
      this.twilioNumbers = []
      this.modal?.hide()
      // deleteActiveProfile already reloaded the list, so the next selection is available now.
      const next = this.profileStore.profiles[0]
      if (next) this.profileStore.setActiveProfile(next)
    },
    async deleteApiKey() {
      if (!(await confirmDelete('Do you want to delete this setting?', 'setting not deleted'))) return
      await this.profileStore.deleteProviderSetting()
      notifySuccess('Key deleted successfully!')
      // The modal stays open on the (still-existing) profile, now with blank provider fields.
      this.form = { ...this.form, api_key: '', number: '', twilio_sid: '', twilio_token: '', twilio_number: '' }
      this.telnyxNumbers = []
      this.twilioNumbers = []
    },
    /**
     * Fetch the provider's available numbers into the matching autocomplete list, using the creds in the form.
     * The route requires non-empty creds, so skip the call (leaving the list empty) until they're filled in.
     */
    async loadProviderNumbers(type: 'telnyx' | 'twilio') {
      const v = this.r$.$value
      if (type === 'telnyx') {
        this.telnyxNumbers = []
        if (!v.api_key) return
        const data = await getProviderNumbers({ type: 'telnyx', api_key: v.api_key })
        if (data.type !== 'telnyx') throw new Error('backend returned wrong number type')
        this.telnyxNumbers = data.numbers
      } else {
        this.twilioNumbers = []
        if (!v.twilio_sid || !v.twilio_token) return
        const data = await getProviderNumbers({ type: 'twilio', twilio_sid: v.twilio_sid, twilio_token: v.twilio_token })
        if (data.type !== 'twilio') throw new Error('backend returned wrong number type')
        this.twilioNumbers = data.numbers
      }
    },
    async saveProviderSetting() {
      // dont use validated `data`: createVariant types its provider fields as MaybeOutput<string>, not string.
      const { valid } = await this.r$.$validate()
      if (!valid) return
      const activeProfile = this.profileStore.activeProfile
      if (!activeProfile) return // open() gates on this; re-checked for type narrowing
      // r$.$value is reactive and the awaits below give the user a window to edit the form, so grab a snapshot
      const { type, api_key, number, twilio_sid, twilio_token, twilio_number } = this.r$.$value
      const base = { setting: this.profileStore.activeProfileId, profile: activeProfile.profile ?? '', override: true }
      const providerSettingPayload: ProviderSettingPayload =
        type === 'telnyx'
          ? { ...base, type, api_key, number, sid: this.telnyxNumbers.find((n) => n.phone_number === number)?.id ?? '' }
          : {
              ...base,
              type,
              twilio_sid,
              twilio_token,
              twilio_number,
              sid: this.twilioNumbers.find((n) => n.phoneNumber === twilio_number)?.sid ?? '',
            }
      this.isSavingProviderSetting = true
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
        this.isSavingProviderSetting = false
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
      await this.createProviderSetting(providerSettingPayload)
    },
    async createProviderSetting(providerSettingPayload: ProviderSettingPayload) {
      this.isSavingProviderSetting = true
      try {
        await this.profileStore.saveProviderSetting(providerSettingPayload)
        this.modal?.hide()
        this.r$.$reset() // just-saved values are the new baseline
      } finally {
        this.isSavingProviderSetting = false
      }
    },
  },
})
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
