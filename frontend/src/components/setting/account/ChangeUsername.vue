<template>
    <div class="p-1">
        <form @submit.prevent="handleSubmit" class="ml-2 mr-2">
           <div class="form-group mt-2">
                <input class="form-control" name="email" v-model="form.email" placeholder="Enter Username" :class="{ 'is-invalid': submitted3 && v$.form.email.$error }" />
                <div v-if="submitted3 && v$.form.email.$error" class="invalid-feedback">
                    <span v-if="v$.form.email.required.$invalid">Email Is Required</span>
                </div>
            </div>
            <div class="form-group">
                <button class="btn btn-success mt-2" type="submit">Change</button>
            </div>
        </form>
    </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue'
import { useVuelidate } from '@vuelidate/core'
import { required } from '@vuelidate/validators'
import Cookies from 'js-cookie'
import { notifySuccess } from '@/notify.ts'
import { parseJSON } from '@/helper.ts'

export default defineComponent({
  setup () {
    return { v$: useVuelidate() }
  },
  data () {
    return {
      form: {
        email: ''
      },
      submitted3: false
    }
  },
  validations: {
    form: {
      email: {required}
    }
  },
  mounted () {
    const userdata = parseJSON(Cookies.get('userdata'))
    if (userdata.email !== undefined) {
      this.form.email = userdata.email
    }
  },
  methods: {
    handleSubmit () {
      this.submitted3 = true
      this.v$.$touch()
      if (this.v$.$invalid) {
        return
      }
      this.$patch('auth/username', this.form)
        .then((response) => {
          if (response) {
            Cookies.set('userdata', JSON.stringify(response.data), { expires: 30 })
            notifySuccess('Username updated successfully')
          }
        })
        .catch((e) => console.error(e))
    }
  }
})
</script>
