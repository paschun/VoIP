<template>
    <div class="p-1">
        <form @submit.prevent="handleSubmit" class="ml-2 mr-2">
          <div class="form-group mb-2 mt-4">
            <input class="form-control" v-model="user.old_password" name="password" type="password" placeholder="Old Password" :class="{ 'is-invalid': submitted && $v.user.old_password.$error }">
            <div v-if="submitted && $v.user.old_password.$error" class="invalid-feedback">
                <span v-if="!$v.user.old_password.required">old Password is required</span>
            </div>
          </div>

          <div class="form-group mb-2 mt-4">
            <input class="form-control" v-model="user.password"  type="password" placeholder="New Password" id="login-input" :class="{ 'is-invalid': submitted && $v.user.password.$error }">
            <div v-if="submitted && $v.user.password.$error" class="invalid-feedback">
                <span v-if="!$v.user.password.required">Password is required</span>
                <span v-if="!$v.user.password.minLength">Please enter a valid password</span>
            </div>
          </div>
              <div class="form-group mb-2 mt-2">
                <input class="form-control" v-model="user.c_password"  type="password" placeholder="Confirm Password" id="clogin-input" :class="{ 'is-invalid': submitted && $v.user.c_password.$error }">
                <div v-if="submitted && $v.user.c_password.$error" class="invalid-feedback">
                    <span v-if="!$v.user.c_password.required">Confirm Password is required<br></span>
                    <span v-if="!$v.user.c_password.sameAsPassword">Password and confirm password are not match!</span>
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
import { required, minLength, sameAs } from 'vuelidate/lib/validators'
import { notifySuccess } from '@/notify'
export default defineComponent({
  data () {
    return {
      user: {
        old_password: '',
        password: '',
        c_password: ''
      },
      submitted: false
    }
  },
  validations: {
    user: {
      old_password: { required },
      password: { required, minLength: minLength(6) },
      c_password: { required, sameAsPassword: sameAs('password') }
    }
  },
  mounted() {
    // this.getContacts()
  },
  methods: {
    handleSubmit () {
      this.submitted = true
      this.$v.$touch()
      if (this.$v.$invalid) {
        return
      }
      this.$post('auth/password/update', this.user)
        .then((response) => {
          if (response) {
            notifySuccess('Password updated successfully')
            this.submitted = false
            this.user = {
              old_password: '',
              password: '',
              c_password: ''
            }
            // this.$cookie.set('userdata', JSON.stringify(response.data), 30)
          }
        })
        .catch((e) => {
          console.error(e)
        })
    }
  }
})
</script>
