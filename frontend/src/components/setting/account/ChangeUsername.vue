<template>
    <div class="p-1">
        <form @submit.prevent="handleSubmit" class="ml-2 mr-2">
           <div class="form-group mt-2">
                <input class="form-control" name="email" v-model="form.email" placeholder="Enter Username" :class="{ 'is-invalid': submitted && v$.form.email.$error }" />
                <div v-if="submitted && v$.form.email.$error" class="invalid-feedback">
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
import { notifySuccess } from '@/notify.ts'
import { useUserStore } from '@/stores/user.ts'

export default defineComponent({
  setup () {
    return { v$: useVuelidate(), userStore: useUserStore() }
  },
  data () {
    return {
      form: {
        email: ''
      },
      submitted: false
    }
  },
  validations: {
    form: {
      email: {required}
    }
  },
  mounted () {
    this.form.email = this.userStore.userData?.email ?? ''
  },
  methods: {
    async handleSubmit () {
      this.submitted = true
      this.v$.$touch()
      if (this.v$.$invalid) {
        return
      }
      await this.userStore.changeUsername(this.form.email)
      notifySuccess('Username updated successfully')
    }
  }
})
</script>
