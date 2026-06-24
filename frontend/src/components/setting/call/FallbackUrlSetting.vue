<template>
  <div class="py-1 px-2">
    <form @submit.prevent="handleSubmit" class="ml-2 mr-2">
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
import { defineComponent } from 'vue'
import { useRegle } from '@regle/core'
import { notifySuccess } from '@/notify.ts'
import { required, withMessage, httpUrl } from '@regle/rules'

/** Read a property out of an object using a dotted path (e.g. "data.data.webhook_url"). */
const pickPath = (obj: any, path: string): any => path.split('.').reduce((acc, k) => acc?.[k], obj)

/** Strip everything but `${protocol}//${hostname}` from a URL string. */
const toOrigin = (str: string): string => {
  const u = new URL(str)
  return `${u.protocol}//${u.hostname}`
}

/**
 * Shared "webhook URL + fallback URL" settings form, used by the Telnyx
 * SIP/TeXML/Message and Twilio TwiML settings panels.
 *
 * TODO: rename this component (and the `resource` framing). The backend group is no longer "fallback" -- it is
 * `/api/provider` and this form reads/patches the provider webhook config. A name like `ProviderWebhookSetting`
 * would match; the file lives under `setting/call/` and is referenced by TwimlSetting.vue / MessageSetting.vue.
 */
export default defineComponent({
  name: 'FallbackUrlSetting',
  setup (props) {
    const { r$ } = useRegle('', {
      required: withMessage(required, () => props.requiredMessage), // default: This field is required
      // keyed `validUrl`, not `url`, so it doesn't collide with Regle's built-in `url` rule name
      validUrl: withMessage(httpUrl, () => props.invalidMessage) // default: The value is not a valid http URL address
    })
    return { r$ }
  },
  props: {
    /** Resource base path; GET `${resource}/${settingId}` loads current values, PUT `${resource}/${settingId}` saves. */
    resource: { type: String, required: true },
    /** Dotted path to the read-only "main" URL in the GET response. */
    mainPath: { type: String, required: true },
    /** Dotted path to the editable fallback URL in the GET response. */
    fallbackPath: { type: String, required: true },
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
      setting: null as any
    }
  },
  mounted () {
    this.getCallSetting()
  },
  methods: {
    getCallSetting () {
      const profileLocal = localStorage.getItem('activeProfile')
      if (!profileLocal) return
      this.setting = JSON.parse(profileLocal)?._id

      this.$get(`${this.resource}/${this.setting}`)
        .then((response) => {
          const main = pickPath(response, this.mainPath)
          const fallback = pickPath(response, this.fallbackPath)
          const normalize = (v: any) => this.normalizeHost && v ? toOrigin(v) : v
          this.mainUrl = normalize(main) ?? ''
          if (fallback) this.r$.$value = normalize(fallback)
        })
        .catch((e) => console.error(e))
    },
    async handleSubmit () {
      const { valid, data } = await this.r$.$validate()
      if (!valid) return

      const submitUrl = this.normalizeSubmit ? toOrigin(data) : data
      try {
        const response = await this.$patch(`${this.resource}/${this.setting}`, { fallbackUrl: submitUrl })
        if (!response) return
        notifySuccess(this.successMessage)
        this.getCallSetting()
      } catch (e) {
        console.error(e)
      }
    }
  }
})
</script>

<style scoped>
.main-url-control[readonly] {
  background: white !important;
}
</style>
