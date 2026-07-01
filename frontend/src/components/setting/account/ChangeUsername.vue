<template>
  <div class="p-1">
    <form @submit.prevent="changeUsername" class="ml-2 mr-2">
      <div class="form-group mt-2">
        <input class="form-control" v-model="r$.$value" placeholder="Enter Username" :class="{ 'is-invalid': r$.$error }" />
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

<script lang="ts">
import { defineComponent, ref } from 'vue'
import { useRegle } from '@regle/core'
import { required, minLength, lowercase } from '@regle/rules'
import { DetailedError } from 'hono/client'
import { notifySuccess } from '@/notify.ts'
import { useUserStore } from '@/stores/user.ts'

export default defineComponent({
  setup() {
    const userStore = useUserStore()
    // A standalone ref is the whole single-field form; the username is snapshotted from the store (one-time copy, not a
    // live binding).
    const name = ref(userStore.userData?.name ?? '')
    const { r$ } = useRegle(name, { required, minLength: minLength(2), lowercase })
    return { r$, userStore }
  },
  methods: {
    async changeUsername() {
      const { valid, data } = await this.r$.$validate()
      if (!valid) return
      try {
        await this.userStore.changeUsername(data)
      } catch (err) {
        if (err instanceof DetailedError) {
          this.r$.$setExternalErrors([err.detail?.data?.message])
        }
        throw err // skips logic below
      }
      this.r$.$reset({ toState: data })
      notifySuccess('Username updated successfully')
    },
  },
})
</script>
