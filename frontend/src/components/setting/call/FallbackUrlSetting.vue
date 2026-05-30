<template>
  <div class="py-1 px-2">
    <form @submit.prevent="handleSubmit" class="ml-2 mr-2">
      <div class="form-group mt-2">
        <label>{{ mainLabel }}</label>
        <input class="form-control main-url-control" v-model="form.main_url" readonly />
      </div>
      <div class="form-group mt-2">
        <label>{{ fallbackLabel }}</label>
        <input
          class="form-control"
          v-model="form.url"
          :placeholder="fallbackPlaceholder"
          :class="{ 'is-invalid': submitted && $v.form.url.$error }"
        />
        <div v-if="submitted && $v.form.url.$error" class="invalid-feedback">
          <span v-if="!$v.form.url.required">{{ requiredMessage }}</span>
          <span v-if="!$v.form.url.url">{{ invalidMessage }}</span>
        </div>
      </div>
      <div class="form-group">
        <button class="btn btn-success mt-2" type="submit">Update</button>
      </div>
    </form>
  </div>
</template>

<script>
import { post } from '../../../core/module/common.module'
import { notifySuccess } from '@/notify'
import { required, helpers } from 'vuelidate/lib/validators'

// eslint-disable-next-line no-useless-escape
const url = helpers.regex('phonenumber', /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/)

/** Read a property out of an object using a dotted path (e.g. "data.data.webhook_url"). */
const pickPath = (obj, path) => path.split('.').reduce((acc, k) => acc?.[k], obj)

/** Strip everything but `${protocol}//${hostname}` from a URL string. */
const toOrigin = (str) => {
  const u = new URL(str)
  return `${u.protocol}//${u.hostname}`
}

/**
 * Shared "webhook URL + fallback URL" settings form, used by the Telnyx
 * SIP/TeXML/Message and Twilio TwiML settings panels.
 */
export default {
  name: 'FallbackUrlSetting',
  props: {
    /** Endpoint to load current setting values from (POST). */
    getUrl: { type: String, required: true },
    /** Endpoint to persist the updated fallback URL (POST). */
    saveUrl: { type: String, required: true },
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
      form: { url: '', main_url: '' },
      submitted: false,
      setting: null
    }
  },
  validations: {
    form: { url: { required, url } }
  },
  mounted () {
    this.getCallSetting()
  },
  methods: {
    getCallSetting () {
      const profileLocal = localStorage.getItem('activeProfile')
      if (!profileLocal) return
      this.setting = JSON.parse(profileLocal)?._id

      const request = { data: { setting_id: this.setting }, url: this.getUrl }
      this.$store
        .dispatch(post, request)
        .then((response) => {
          const main = pickPath(response, this.mainPath)
          const fallback = pickPath(response, this.fallbackPath)
          const normalize = (v) => this.normalizeHost && v ? toOrigin(v) : v
          this.form.main_url = normalize(main) ?? ''
          if (fallback) this.form.url = normalize(fallback)
        })
        .catch((e) => console.error(e))
    },
    handleSubmit () {
      this.submitted = true
      this.$v.$touch()
      if (this.$v.$invalid) return

      const submitUrl = this.normalizeSubmit ? toOrigin(this.form.url) : this.form.url
      const data = { ...this.form, url: submitUrl, setting_id: this.setting }
      const request = { data, url: this.saveUrl }
      this.$store
        .dispatch(post, request)
        .then((response) => {
          if (!response) return
          notifySuccess(this.successMessage)
          this.getCallSetting()
        })
        .catch((e) => console.error(e))
    }
  }
}
</script>

<style scoped>
.main-url-control[readonly] {
  background: white !important;
}
</style>
