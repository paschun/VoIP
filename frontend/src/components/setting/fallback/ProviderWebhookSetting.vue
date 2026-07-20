<template>
  <div class="py-1 px-2">
    <form class="ml-2 mr-2" @submit.prevent="saveFallbackUrl">
      <div class="form-group mt-2">
        <label>{{ mainLabel }}</label>
        <input v-model="mainUrl" class="form-control" disabled>
      </div>
      <div class="form-group mt-2">
        <label>{{ fallbackLabel }}</label>
        <input v-model="r$.$value" class="form-control" :placeholder="fallbackPlaceholder" :class="{ 'is-invalid': r$.$error }">
        <div v-if="r$.$error" class="invalid-feedback">
          <span v-for="error of r$.$errors" :key="error">{{ error }}</span>
        </div>
      </div>
      <div class="form-group">
        <!-- todo: use $correct here? -->
        <button class="btn btn-success mt-2" type="submit" :disabled="r$.$invalid">Update</button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRegle } from '@regle/core'
import { required, withMessage, httpUrl } from '@regle/rules'
import { useActiveProfileChange } from '@/composables/useActiveProfileChange.ts'
import { client, request } from '@/core/rpc.client.ts'
import { notifySuccess } from '@/core/notify.ts'
import { useProfileStore } from '@/stores/profile.ts'

/** Strip a URL down to its origin; unparseable input passes through untouched.
 * The backend takes the url you send and appends its own fixed webhook path to it.
 * The user edits the host, the app owns the path.
 */
const toOrigin = (url: string): string => URL.parse(url)?.origin ?? url

/**
 * Shared "webhook URL + fallback URL" settings form, used by the Telnyx
 * SIP/TeXML/Message and Twilio TwiML settings panels. Reads/patches the provider webhook config under `/api/provider`.
 */
const props = withDefaults(
  defineProps<{
    /** Which provider's webhook config to read/patch (selects the typed RPC route). */
    provider: 'twilio' | 'telnyx'
    /** Toast text shown after a successful save. */
    successMessage: string
    mainLabel?: string
    fallbackLabel?: string
    fallbackPlaceholder?: string
    requiredMessage?: string
    invalidMessage?: string
  }>(),
  {
    mainLabel: 'Webhook URL',
    fallbackLabel: 'Webhook Fallback URL',
    fallbackPlaceholder: 'Enter Webhook Fallback URL',
    requiredMessage: 'URL Is Required',
    invalidMessage: 'Please enter valid URL',
  },
)

const profileStore = useProfileStore()
const mainUrl = ref('')
const fallbackUrl = ref('')
const { r$ } = useRegle(fallbackUrl, {
  required: withMessage(required, () => props.requiredMessage), // default: This field is required
  // keyed `validUrl`, not `url`, so it doesn't collide with Regle's built-in `url` rule name
  validUrl: withMessage(httpUrl, () => props.invalidMessage), // default: The value is not a valid http URL address
})

async function getCallSetting() {
  const settingId = profileStore.activeProfileId
  if (!settingId) return
  // Dont make remote request for webhook setting if localstorage profile doesnt have API key.
  const profile = profileStore.activeProfile
  const configured = props.provider === 'twilio' ? Boolean(profile?.twilio_sid) : Boolean(profile?.api_key)
  if (!configured) return

  let main: string | null | undefined
  let fallback: string | null | undefined
  if (props.provider === 'twilio') {
    const { data } = await request(client.api.provider.twilio.webhook[':settingId'].$get({ param: { settingId } }))
    main = data.voiceUrl
    fallback = data.voiceFallbackUrl
  } else {
    const { data } = await request(client.api.provider.telnyx.webhook[':settingId'].$get({ param: { settingId } }))
    main = data.webhook_url
    fallback = data.webhook_failover_url
  }
  mainUrl.value = main ? toOrigin(main) : ''
  if (fallback) fallbackUrl.value = toOrigin(fallback)
}

async function saveFallbackUrl() {
  const { valid, data } = await r$.$validate()
  const settingId = profileStore.activeProfileId
  if (!valid || !settingId) return

  const submitUrl = toOrigin(data)
  const param = { settingId }
  if (props.provider === 'twilio') {
    await request(client.api.provider.twilio.webhook[':settingId'].$patch({ param, json: { fallbackUrl: submitUrl } }))
  } else {
    await request(client.api.provider.telnyx.webhook[':settingId'].$patch({ param, json: { fallbackUrl: submitUrl } }))
  }
  void notifySuccess(props.successMessage)
  await getCallSetting()
}

// Re-fetch when the selected profile changes while this panel stays mounted, so the URLs don't go stale.
useActiveProfileChange(getCallSetting)
</script>
