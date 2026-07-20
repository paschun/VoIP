<template>
  <div class="p-1">
    <form class="ml-2 mr-2" @submit.prevent="changePassword">
      <div class="form-group mb-2 mt-4">
        <input
          v-model="r$.$value.old_password"
          class="form-control"
          type="password"
          placeholder="Old Password"
          :class="{ 'is-invalid': r$.old_password.$error }"
        >
        <FieldErrors :field="r$.old_password" />
      </div>

      <div class="form-group mb-2 mt-4">
        <input v-model="r$.$value.password" class="form-control" type="password" placeholder="New Password" :class="{ 'is-invalid': r$.password.$error }">
        <FieldErrors :field="r$.password" />
      </div>

      <div class="form-group mb-2 mt-2">
        <input
          v-model="r$.$value.c_password"
          class="form-control"
          type="password"
          placeholder="Confirm Password"
          :class="{ 'is-invalid': r$.c_password.$error }"
        >
        <FieldErrors :field="r$.c_password" />
      </div>
      <div class="form-group">
        <button class="btn btn-success mt-2" type="submit" :disabled="!r$.$correct">Change</button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import { useRegle } from '@regle/core'
import { required, minLength, sameAs, withMessage } from '@regle/rules'
import { client, request } from '@/core/rpc.client.ts'
import { setServerErrors } from '@/core/handle-error.ts'
import { notifySuccess } from '@/core/notify.ts'

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
    sameAs: withMessage(
      sameAs(() => form.password),
      'Password and confirm password do not match!',
    ), // default: The value must be equal to the password value
  },
})

async function changePassword() {
  const { valid, data } = await r$.$validate()
  if (!valid) return
  try {
    await request(client.api.auth.password.$put({ json: data }))
  } catch (err) {
    // The only field-level server error is a wrong old password (400)
    setServerErrors(r$, err, (message) => ({ old_password: [message] }))
    throw err // skips logic below
  }
  r$.$reset({ toOriginalState: true })
  void notifySuccess('Password updated successfully')
}
</script>
