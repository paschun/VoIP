<template>
    <div class="py-1 px-2">
        <form @submit.prevent="handleSubmit" class="ml-2 mr-2">
          <div class="form-group mt-2">
            <label>Webhook URL</label>
            <input class="form-control main-url-control" name="main_url" v-model="form.main_url" readonly />
          </div>
          <div class="form-group mt-2">
            <label>Webhook Fallback URL</label>
            <input class="form-control" name="url" v-model="form.url" placeholder="Enter Twiml Fallback Url" :class="{ 'is-invalid': submitted3 && $v.form.url.$error }" />
            <div v-if="submitted3 && $v.form.url.$error" class="invalid-feedback">
                <span v-if="!$v.form.url.required">Twiml Fallback Url Is Required</span>
                <span v-if="!$v.form.url.url">Please enter valid Twiml Fallback Url</span>
                <!-- <span v-if="!$v.form.email.email">Please enter valid email</span> -->
            </div>
          </div>
          <div class="form-group">
            <button class="btn btn-success mt-2" type="submit">Update</button>
          </div>
        </form>
    </div>
</template>
<script>
import { post } from '../../../../core/module/common.module'
import { required, helpers } from 'vuelidate/lib/validators'
// eslint-disable-next-line no-useless-escape
const url = helpers.regex('phonenumber', /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/)

export default {
  data () {
    return {
      form: {
        url: '',
        main_url: ''
      },
      submitted3: false,
      setting: null
    }
  },
  validations: {
    form: {
      url: { required, url }
    }
  },
  mounted () {
    this.getCallSetting()
  },
  methods: {
    getCallSetting () {
      const profileLocal = localStorage.getItem('activeProfile')
      if (profileLocal) {
        const activeProfile = JSON.parse(profileLocal)
        this.setting = activeProfile._id
        const request = {
          data: {setting_id: this.setting},
          url: 'setting/telnyx/sip/get'
        }
        this.$store
          .dispatch(post, request)
          .then((response) => {
            this.form.main_url = response.data.data.webhook_event_url
            if (response.data.data.webhook_event_failover_url) {
              this.form.url = response.data.data.webhook_event_failover_url
            }
          })
          .catch((e) => {
            console.error(e)
          })
      }
    },

    handleSubmit (e) {
      this.submitted3 = true
      // stop here if form is invalid
      this.$v.$touch()
      if (this.$v.$invalid) {
        return
      }
      const data = this.form
      data.setting_id = this.setting
      const request = {
        data: data,
        url: 'setting/telnyx/sip/fallback'
      }
      this.$store
        .dispatch(post, request)
        .then((data) => {
          if (data) {
            this.$swal({
              icon: 'success',
              title: 'Success',
              text: 'SIP Setting updated successfully!'
            })
            this.getCallSetting()
          }
        })
        .catch((e) => {
          console.error(e)
        })
    }
  }
}
</script>

<style scoped>
  .main-url-control[readonly]{
    background: white !important;
  }
</style>
