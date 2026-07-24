import { watch } from 'vue'
import { useEventSource } from '@vueuse/core'
import { COMMUNICATION_EVENT, pushMessage, type PushMessage } from '@shared/contracts/push.ts'
import { authToken } from '@/core/auth-token.ts'
import { showMessageNotification } from '@/core/notify.ts'
import { useConversationStore } from '@/stores/conversation.ts'
import { useProfileStore } from '@/stores/profile.ts'

/** Parse + validate one SSE `data` payload; malformed frames are logged and dropped. */
function parsePush(raw: string | undefined): PushMessage | null {
  // A message event's data is always a string; `undefined` is only the serializer type's leniency, so nothing to log.
  if (raw === undefined) return null
  try {
    return pushMessage.parse(JSON.parse(raw))
  } catch (e) {
    console.error('Malformed push frame', raw, e)
    return null
  }
}

/** Refresh the affected stores and raise a desktop notification for one pushed frame. */
function onPush(msg: PushMessage) {
  console.log('SSE push', msg)
  const conversationStore = useConversationStore()
  if (conversationStore.hasActiveConversation) {
    void conversationStore.refreshMessages()
  } else {
    const profileStore = useProfileStore()
    void profileStore.refreshActiveProfile()
    void profileStore.loadProfiles()
  }
  void conversationStore.loadConversations()
  void showMessageNotification(msg.number, msg.message)
}

/**
 * Subscribe to the server's SSE push stream (`GET /api/events`) for the logged-in user; opens on setup, closes on scope
 * dispose. The JWT rides in `?token=` since EventSource can't set headers. Call once from the dashboard's `<script setup>`.
 *
 * Watches `lastEventId` (a unique per-frame id) not `data`, so two identical consecutive payloads still notify.
 */
export function useServerEvents() {
  // authToken is the same for the whole session so URL doesnt need to be reactive off of it
  const url = `/api/events?token=${encodeURIComponent(authToken.value)}`
  const { data, lastEventId } = useEventSource(url, [COMMUNICATION_EVENT], {
    autoReconnect: true,
    serializer: { read: parsePush },
  })
  watch(lastEventId, () => {
    if (data.value) onPush(data.value)
  })
}
