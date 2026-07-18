<template>
  <div style="max-width: 300px">
    <center class="mt-3 pt-3">
      <div class="pt-4 pb-2">
        <button type="button" class="btn btn-success m-1">
          <i-bi-person-fill aria-hidden="true" />
        </button>
        <p class="font-weight-bold mt-2" style="font-size: 30px; color: #787878; margin-bottom: 0">
          {{ callStore.remoteName }}
        </p>
        <p class="font-weight-bold" style="font-size: 30px; color: #787878">
          {{ callStore.remoteNumber }}
        </p>
      </div>
      <h4 class="mb-4">Incoming call</h4>
      <button type="button" class="btn btn-success m-1" @click="callStore.accept()">
        <i-bi-telephone-fill aria-hidden="true" />
      </button>
      <button type="button" class="btn btn-danger m-1" @click="callStore.reject()">
        <i-bi-x-circle aria-hidden="true" />
      </button>
    </center>
  </div>
</template>

<script lang="ts">
/** Ringing screen: caller name/number with accept + reject, all straight off the call store. */
import { defineComponent } from 'vue'
import { useCallStore } from '@/stores/call.ts'

export default defineComponent({
  name: 'IncomingCallPanel',
  setup() {
    return { callStore: useCallStore() }
  },
})
</script>
