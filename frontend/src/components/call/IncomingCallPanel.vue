<template>
  <div class="caller">
    <center class="mt-3 pt-3">
      <div class="pt-4 pb-2">
        <button type="button" class="btn btn-success m-1">
          <IBiPersonFill aria-hidden="true" />
        </button>
        <p class="font-weight-bold mt-2 mb-0 caller-name">
          {{ callStore.remoteName }}
        </p>
        <p class="font-weight-bold caller-name">
          {{ callStore.remoteNumber }}
        </p>
      </div>
      <h4 class="mb-4">Incoming call</h4>
      <button type="button" class="btn btn-success m-1" @click="callStore.accept()">
        <IBiTelephoneFill aria-hidden="true" />
      </button>
      <button type="button" class="btn btn-danger m-1" @click="callStore.reject()">
        <IBiXCircle aria-hidden="true" />
      </button>
    </center>
  </div>
</template>

<script setup lang="ts">
/** Ringing screen: caller name/number with accept + reject, all straight off the call store. */
import { useCallStore } from '@/stores/call.ts'

const callStore = useCallStore()
</script>

<style scoped>
.caller {
  max-width: 300px;
}
.caller-name {
  font-size: 30px;
  color: #787878;
}
</style>
