<template>
    <div class="p-1">
        <form @submit.prevent="changePassword" class="ml-2 mr-2">
          <div class="form-group mb-2 mt-4">
            <input class="form-control" v-model="r$.$value.old_password" type="password" placeholder="Old Password" :class="{ 'is-invalid': r$.old_password.$error }">
            <div v-if="r$.old_password.$error" class="invalid-feedback">
                <span v-for="error of r$.old_password.$errors" :key="error">{{ error }}</span>
            </div>
          </div>

          <div class="form-group mb-2 mt-4">
            <input class="form-control" v-model="r$.$value.password" type="password" placeholder="New Password" :class="{ 'is-invalid': r$.password.$error }">
            <div v-if="r$.password.$error" class="invalid-feedback">
                <span v-for="error of r$.password.$errors" :key="error">{{ error }}</span>
            </div>
          </div>

          <div class="form-group mb-2 mt-2">
            <input class="form-control" v-model="r$.$value.c_password" type="password" placeholder="Confirm Password" :class="{ 'is-invalid': r$.c_password.$error }">
            <div v-if="r$.c_password.$error" class="invalid-feedback">
                <span v-for="error of r$.c_password.$errors" :key="error">{{ error }}</span>
            </div>
          </div>
            <div class="form-group">
                <button class="btn btn-success mt-2" type="submit" :disabled="!r$.$correct">Change</button>
            </div>
        </form>
    </div>
</template>

<script lang="ts">
import { defineComponent, reactive } from 'vue'
import { useRegle } from '@regle/core'
import { required, minLength, sameAs, withMessage } from '@regle/rules'
import { DetailedError } from 'hono/client'
import { notifySuccess } from '@/notify.ts'
import { client, request } from '@/core/rpc.client.ts'

export default defineComponent({
  setup () {
    const form = reactive({ old_password: '', password: '', c_password: '' })
    const { r$ } = useRegle(form, {
      old_password: { required: withMessage(required, 'Old Password is required') }, // default: This field is required
      password: {
        required: withMessage(required, 'Password is required'),
        minLength: minLength(6), // default: The value must be at least 6 characters long
      },
      c_password: {
        required: withMessage(required, 'Confirm Password is required'),
        // c_password doesn't need to recheck length because too-short password blocks total validation
        // backend currently has a length validator on c_password as well
        sameAs: withMessage(sameAs(() => form.password), 'Password and confirm password do not match!') // default: The value must be equal to the password value
      }
    })
    return { r$ }
  },
  methods: {
    async changePassword () {
      const { valid, data } = await this.r$.$validate()
      if (!valid) return
      try {
        await request(client.api.auth.password.$put({ json: data }))
      } catch (err) {
        // The only field-level server error is a wrong old password (400)
        if (err instanceof DetailedError) {
          this.r$.$setExternalErrors({ old_password: [err.detail?.data?.message] })
        }
        throw err // skips logic below
      }
      this.r$.$reset({ toOriginalState: true })
      notifySuccess('Password updated successfully')
    }
  }
})
</script>
