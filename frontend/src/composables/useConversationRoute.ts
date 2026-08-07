import { shallowRef, watch } from 'vue'
import { useRouteParams } from '@vueuse/router'
import { useConversationStore } from '@/stores/conversation.ts'

/**
 * Two-way sync between the dashboard's `:number` param and the open conversation, so every thread has a shareable
 * URL and back/forward moves between threads. Call once from DashboardView's `<script setup>`.
 */
export function useConversationRoute() {
  const conversationStore = useConversationStore()

  const mode = shallowRef<'push' | 'replace'>('push')
  // Writing to this ref makes vueuse navigate with `params: { ...route.params, number: <written value> }`.
  // vue-router then drops the param segment when the ref is '' but keeps the current one when it is
  // undefined -- and vueuse substitutes undefined for any written value equal to defaultValue. So with a ''
  // default, clearing (writing '') would navigate with `number: undefined` and leave the URL unchanged.
  // https://github.com/vueuse/vueuse/issues/3536
  const numberParam = useRouteParams<string | undefined>('number', undefined, { mode })

  /** Rewrite the `:number` param -- push for a thread (back returns to the previous one), replace to drop it. */
  function setNumberParam(number: string) {
    mode.value = number ? 'push' : 'replace'
    numberParam.value = number
  }

  // selection -> URL
  watch(
    () => conversationStore.activeRemoteNumber,
    (number) => {
      if (number !== (numberParam.value ?? '')) setNumberParam(number)
    },
  )

  // URL -> selection: deep links and back/forward. Also re-runs when the inbox (re)loads, which is what resolves a
  // param on cold load -- the row objects `openConversation` needs don't exist until then.
  watch(
    [numberParam, () => conversationStore.conversations],
    ([number]) => {
      if (!number) {
        conversationStore.clearActiveConversation()
        return
      }
      if (number === conversationStore.activeRemoteNumber) return
      // conversations is an aggregate in which _id is the other-party number, not an ObjectId
      const conversation = conversationStore.conversations.find((c) => c._id === number)
      if (conversation) void conversationStore.openConversation(conversation)
      // unknown number: drop the param, but only once the inbox has actually loaded
      else if (!conversationStore.inboxIsLoading) setNumberParam('')
    },
    { immediate: true },
  )
}
