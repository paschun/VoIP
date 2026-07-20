<template>
  <div class="p-1">
    <form class="ml-2 mr-2" @submit.prevent="changeUsername">
      <div class="form-group mt-2">
        <input v-model="r$.$value" class="form-control" placeholder="Enter Username" :class="{ 'is-invalid': r$.$error }">
        <div v-if="r$.$error" class="invalid-feedback">
          <span v-for="error of r$.$errors" :key="error">{{ error }}</span>
        </div>
      </div>
      <div class="form-group">
        <button class="btn btn-success mt-2" type="submit" :disabled="!r$.$correct">Change</button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRegle } from '@regle/core'
import { required, minLength, lowercase } from '@regle/rules'
import { DetailedError } from 'hono/client'
import { notifySuccess } from '@/core/notify.ts'
import { useUserStore } from '@/stores/user.ts'

const userStore = useUserStore()
// A standalone ref is the whole single-field form; the username is snapshotted from the store (one-time copy, not a
// live binding).
const name = ref(userStore.userData?.name ?? '')
const { r$ } = useRegle(name, { required, minLength: minLength(2), lowercase })

async function changeUsername() {
  const { valid, data } = await r$.$validate()
  if (!valid) return
  try {
    await userStore.changeUsername(data)
  } catch (err) {
    if (err instanceof DetailedError) {
      r$.$setExternalErrors([err.detail?.data?.message])
    }
    throw err // skips logic below
  }
  r$.$reset({ toState: data })
  void notifySuccess('Username updated successfully')
}
</script>
