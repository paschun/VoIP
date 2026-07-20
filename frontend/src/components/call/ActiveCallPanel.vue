<template>
  <div class="row m-0 p-2 w-100">
    <div class="d-flex justify-content-center w-100">
      <span>{{ callStore.remoteName }}</span>
    </div>
    <div class="d-flex justify-content-center w-100">
      <span>{{ callStore.remoteNumber }}</span>
    </div>
    <div class="d-flex justify-content-center w-100">
      <span class="font-weight-bold mx-auto mt-2 duration">{{ formatDuration(callStore.duration) }}</span>
    </div>
    <div class="p-1 mt-1 w-100">
      <button type="button" class="btn btn-danger w-100 hangup-btn" @click="callStore.hangup()">Hangup</button>
    </div>
  </div>
</template>

<script setup lang="ts">
/** In-call screen: remote name/number, running duration, hangup, all straight off the call store. */
import { formatDuration } from '@/helper.ts'
import { useCallStore } from '@/stores/call.ts'

const callStore = useCallStore()
</script>

<style scoped>
.duration {
  font-size: 45px;
  color: #4d64bc;
}
.hangup-btn {
  font-size: 30px;
}
</style>
