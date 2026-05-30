<template>
    <div class="p-1">
        <form @submit.prevent="handleSubmit" class="ml-2 mr-2">
           <div class="form-group mt-2">
                <input class="form-control" name="email" v-model="form.email" placeholder="Enter Username" :class="{ 'is-invalid': submitted3 && $v.form.email.$error }" />
                <div v-if="submitted3 && $v.form.email.$error" class="invalid-feedback">
                    <span v-if="!$v.form.email.required">Email Is Required</span>
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
import { required } from 'vuelidate/lib/validators'
import { notifySuccess } from '@/notify'
import { parseJSON } from '@/helper'

export default defineComponent({
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
  mounted: function () {
    // this.getContacts()
    const userdata = parseJSON(this.$cookie.get('userdata'))
    if (userdata.email !== undefined) {
      this.form.email = userdata.email
    }
  },
  methods: {
    handleSubmit () {
      this.submitted3 = true
      this.$v.$touch()
      if (this.$v.$invalid) {
        return
      }
      this.$post('auth/username/update', this.form)
        .then((response) => {
          if (response) {
            this.$cookie.set('userdata', JSON.stringify(response.data), 30)
            notifySuccess('Username updated successfully')
          }
        })
        .catch((e) => console.error(e))
    }
  }
})
</script>
