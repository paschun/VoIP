<template>
  <div class="m-2">
    <div class="card m-1">
      <div class="card-body">
        <p v-if="permission === 'denied'" class="text-danger mb-0">
          Notifications are blocked for this site. Re-allow them in your browser's site permissions, then reload.
        </p>
        <div v-else class="row align-items-center">
          <div class="col-auto"><ToggleSwitch v-model="enabled" @change="toggle" /></div>
          <div class="col-auto">Status: {{ enabled ? 'Enabled' : 'Disabled' }}</div>
        </div>
      </div>
    </div>

    <div class="card m-1">
      <div class="card-body small">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <span class="fw-bold">Delivery channels</span>
          <button class="btn btn-sm btn-outline-secondary" type="button" @click="refresh">Refresh</button>
        </div>
        <dl class="row mb-0">
          <dt class="col-5">Live updates (SSE)</dt>
          <dd class="col-7 mb-1">
            <span class="badge" :class="sseBadge.variant">{{ sseBadge.text }}</span>
            <span v-if="lastSseEventAt" class="text-muted ms-2">last event {{ lastSseEventAt.toLocaleTimeString() }}</span>
          </dd>

          <template v-if="mobile">
            <dt class="col-5">Service worker</dt>
            <dd class="col-7 mb-1"><span class="badge" :class="workerBadge.variant">{{ workerBadge.text }}</span></dd>

            <dt class="col-5">Web push</dt>
            <dd class="col-7 mb-1"><span class="badge" :class="pushBadge.variant">{{ pushBadge.text }}</span></dd>

            <template v-if="status.endpoint">
              <dt class="col-5">Push service</dt>
              <dd class="col-7 mb-1">{{ pushServiceHost }}</dd>

              <dt class="col-5">Full Endpoint</dt>
              <dd class="col-7 mb-1">
                <code class="d-inline-block w-100 align-bottom" :title="status.endpoint">{{ status.endpoint }}</code>
              </dd>
            </template>
          </template>
        </dl>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { EventSourceStatus } from '@vueuse/core'
import ToggleSwitch from '@/components/shared/ToggleSwitch.vue'
import { lastSseEventAt, sseStatus } from '@/composables/useServerEvents.ts'
import { getNotifPerm, notifyError, notifyInfo } from '@/core/notify.ts'
import { client, request } from '@/core/rpc.client.ts'
import { disablePush, getPushStatus, requestAndSubscribe, type PushStatus } from '@/core/push.ts'
import { isMobile } from '@/helper.ts'

type Badge = { text: string; variant: string }

const SSE_BADGES: Record<EventSourceStatus, Badge> = {
  OPEN: { text: 'connected', variant: 'bg-success' },
  CONNECTING: { text: 'connecting', variant: 'bg-warning text-dark' },
  CLOSED: { text: 'disconnected', variant: 'bg-danger' },
}

const mobile = isMobile()

const permission = ref<NotificationPermission>(getNotifPerm())
const enabled = ref(false)
const status = ref<PushStatus>({})
const vapidConfigured = ref(false)

const sseBadge = computed(() => SSE_BADGES[sseStatus.value])

const pushBadge = computed<Badge>(() => {
  if (!vapidConfigured.value) return { text: 'unavailable (no server VAPID key)', variant: 'bg-secondary' }
  if (!status.value.endpoint) return { text: 'not subscribed', variant: 'bg-danger' }
  return { text: 'subscribed', variant: 'bg-success' }
})

const workerBadge = computed<Badge>(() => {
  const state = status.value.workerState
  if (!state) return { text: 'not registered', variant: 'bg-secondary' }
  return { text: state, variant: state === 'activated' ? 'bg-success' : 'bg-danger' }
})

const pushServiceHost = computed(() => (status.value.endpoint ? new URL(status.value.endpoint).host : ''))

/**
 * On mobile the switch tracks the push subscription itself, so it survives a reload and reflects a revoke from
 * anywhere; desktop has no subscription, so the browser permission is all there is to track.
 */
async function refresh() {
  status.value = await getPushStatus()
  permission.value = getNotifPerm()
  enabled.value = mobile ? !!status.value.endpoint : permission.value === 'granted'
}

// this component is rendered with v-if so this runs each time the component is opened
onMounted(async () => {
  await refresh()
  if (!mobile) return
  const { data: publicKey } = await request(client.api.push.key.$get())
  vapidConfigured.value = !!publicKey
})

/** The switch is the user gesture the permission prompt requires, so enabling has to start here rather than on mount. */
async function toggle() {
  try {
    if (!enabled.value) {
      await disablePush()
      // Nothing to revoke on desktop -- granted permission is the whole state, and only the browser can withdraw it.
      if (!mobile) void notifyInfo('Turn notifications off in your browser site permissions')
      return
    }
    permission.value = await requestAndSubscribe()
    if (permission.value !== 'granted') void notifyError('Notification permission was not granted')
  } catch (e) {
    // Worker registration failures reject here; without this the switch would flip back with no explanation.
    console.error('Failed to change notification setting', e)
    void notifyError('Could not enable notifications')
  } finally {
    await refresh()
  }
}
</script>
