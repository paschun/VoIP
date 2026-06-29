<template>
  <div class="py-1 px-2">
    <form @submit.prevent="saveFallbackUrl" class="ml-2 mr-2">
      <div class="form-group mt-2">
        <label>{{ mainLabel }}</label>
        <input class="form-control main-url-control" v-model="mainUrl" readonly />
      </div>
      <div class="form-group mt-2">
        <label>{{ fallbackLabel }}</label>
        <input
          class="form-control"
          v-model="r$.$value"
          :placeholder="fallbackPlaceholder"
          :class="{ 'is-invalid': r$.$error }"
        />
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

<script lang="ts">
import { defineComponent, ref, type PropType } from 'vue'
import { useRegle } from '@regle/core'
import { notifySuccess } from '@/notify.ts'
import { required, withMessage, httpUrl } from '@regle/rules'
import { client, request } from '@/core/rpc.client.ts'

/** Strip everything but `${protocol}//${hostname}` from a URL string. */
const toOrigin = (str: string): string => {
  const u = new URL(str)
  return `${u.protocol}//${u.hostname}`
}

/**
 * Shared "webhook URL + fallback URL" settings form, used by the Telnyx
 * SIP/TeXML/Message and Twilio TwiML settings panels. Reads/patches the provider webhook config under `/api/provider`.
 */
export default defineComponent({
  name: 'ProviderWebhookSetting',
  setup (props) {
    const fallbackUrl = ref('')
    const { r$ } = useRegle(fallbackUrl, {
      required: withMessage(required, () => props.requiredMessage), // default: This field is required
      // keyed `validUrl`, not `url`, so it doesn't collide with Regle's built-in `url` rule name
      validUrl: withMessage(httpUrl, () => props.invalidMessage) // default: The value is not a valid http URL address
    })
    return { r$, fallbackUrl }
  },
  props: {
    /** Which provider's webhook config to read/patch (selects the typed RPC route). */
    provider: { type: String as PropType<'twilio' | 'telnyx'>, required: true },
    /** When true, GET response URLs are stripped to `${protocol}//${hostname}`. */
    normalizeHost: { type: Boolean, default: false },
    /** When true, the user-entered fallback URL is stripped to `${protocol}//${hostname}` before submit. */
    normalizeSubmit: { type: Boolean, default: false },
    /** Toast text shown after a successful save. */
    successMessage: { type: String, required: true },
    mainLabel: { type: String, default: 'Webhook URL' },
    fallbackLabel: { type: String, default: 'Webhook Fallback URL' },
    fallbackPlaceholder: { type: String, default: 'Enter Webhook Fallback URL' },
    requiredMessage: { type: String, default: 'Url Is Required' },
    invalidMessage: { type: String, default: 'Please enter valid Url' }
  },
  data () {
    return {
      mainUrl: '',
      setting: null as string | null
    }
  },
  mounted () {
    this.getCallSetting()
  },
  methods: {
    async getCallSetting () {
      const profileLocal = localStorage.getItem('activeProfile')
      if (!profileLocal) return
      this.setting = JSON.parse(profileLocal)?._id
      if (!this.setting) return

      const normalize = (v: string | null | undefined) => (this.normalizeHost && v ? toOrigin(v) : v)
      let main: string | null | undefined
      let fallback: string | null | undefined
      if (this.provider === 'twilio') {
        const { data } = await request(client.api.provider.twilio.webhook[':settingId'].$get({ param: { settingId: this.setting } }))
        main = data.voiceUrl
        fallback = data.voiceFallbackUrl
      } else {
        const { data } = await request(client.api.provider.telnyx.webhook[':settingId'].$get({ param: { settingId: this.setting } }))
        main = data.webhook_url
        fallback = data.webhook_failover_url
      }
      this.mainUrl = normalize(main) ?? ''
      if (fallback) this.fallbackUrl = normalize(fallback) ?? ''
    },
    async saveFallbackUrl () {
      const { valid, data } = await this.r$.$validate()
      if (!valid || !this.setting) return

      const submitUrl = this.normalizeSubmit ? toOrigin(data) : data
      const param = { settingId: this.setting }
      if (this.provider === 'twilio') {
        await request(client.api.provider.twilio.webhook[':settingId'].$patch({ param, json: { fallbackUrl: submitUrl } }))
      } else {
        await request(client.api.provider.telnyx.webhook[':settingId'].$patch({ param, json: { fallbackUrl: submitUrl } }))
      }
      notifySuccess(this.successMessage)
      this.getCallSetting()
    }
  }
})
</script>

<style scoped>
.main-url-control[readonly] {
  background: white !important;
}
</style>
