<template>
  <div class="row m-0 p-2" style="width: 100%">
    <div class="d-flex justify-content-center" style="width: 100%">
      <span>{{ callStore.remoteName }}</span>
    </div>
    <div class="d-flex justify-content-center" style="width: 100%">
      <span>{{ callStore.remoteNumber }}</span>
    </div>
    <div class="d-flex justify-content-center" style="width: 100%">
      <span class="font-weight-bold mx-auto mt-2" style="font-size: 45px; color: #4d64bc">{{ formatDuration(callStore.duration) }}</span>
    </div>
    <div class="p-1 mt-1" style="width: 100%">
      <button type="button" class="btn btn-danger w-100" style="font-size: 30px" @click="callStore.hangup()">Hangup</button>
    </div>
  </div>
</template>

<script lang="ts">
/** In-call screen: remote name/number, running duration, hangup, all straight off the call store. */
import { defineComponent } from 'vue'
import { formatDuration } from '@/helper.ts'
import { useCallStore } from '@/stores/call.ts'

export default defineComponent({
  name: 'ActiveCallPanel',
  setup() {
    return { callStore: useCallStore() }
  },
  methods: { formatDuration },
})
</script>
