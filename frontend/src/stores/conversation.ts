import { computed, ref, watch } from 'vue'
import type { InferResponseType } from 'hono/client'
import type { SuccessStatusCode } from 'hono/utils/http-status'
import { defineStore } from 'pinia'
import { client, request } from '@/core/rpc.client.ts'
import { useProfileStore } from '@/stores/profile.ts'

/** A conversation inbox row, inferred from the conversations route (the synthesized aggregate over the SMS Message model). */
export type Conversation = InferResponseType<typeof client.api.setting.conversations.$get, SuccessStatusCode>['data'][number]
/** One entry in a conversation thread, inferred from the messages route. */
export type ChatMessage = InferResponseType<typeof client.api.setting.conversations.messages.$post, SuccessStatusCode>['data'][number]

/**
 * The active profile's inbox + open chat thread. Holds the conversation list (the Sidebar) and the selected
 * thread's messages (the Dashboard chat pane), and owns every read/write so neither view talks to the conversation
 * routes directly. Selection lives here too (replacing the old per-component `activeChat` + localStorage copy), so the
 * sidebar highlight and the chat pane stay in sync without emits or `$ref` poking.
 *
 * Conversations are always scoped to the one active profile, so this store reads {@link useProfileStore} directly
 * rather than taking a profile id on every action; on a profile switch it clears the open thread and reloads the
 * inbox itself.
 */
export const useConversationStore = defineStore('conversation', () => {
  const profileStore = useProfileStore()

  const conversations = ref<Conversation[]>([])
  const activeConversation = ref<Conversation | null>(null)
  const messages = ref<ChatMessage[]>([])
  const threadIsLoading = ref(false) // true while openConversation fetches the thread (drives the chat-pane loader)
  const inboxIsLoading = ref(false) // true while reloadInbox rebuilds the list (drives the sidebar skeleton)

  // remote party's phone number for the currently-open conversation
  const activeRemoteNumber = computed(() => activeConversation.value?._id ?? '')
  const hasActiveConversation = computed(() => activeConversation.value !== null)

  // A different profile was selected (not a same-id detail refresh): drop the open thread + selection and rebuild
  // the inbox. immediate covers the initial load (a profile restored from localStorage never "changes").
  watch(
    () => profileStore.activeProfileId,
    () => {
      clearActiveConversation()
      void reloadInbox()
    },
    { immediate: true },
  )

  /**
   * Refresh the inbox for the active profile. No profile selected clears the list. Replaces the list in place on
   * arrival (no pre-clear), so a socket-driven refresh swaps seamlessly. Throws (after the toast) on failure.
   */
  async function loadConversations(): Promise<void> {
    const profile = profileStore.activeProfileId
    if (!profile) {
      conversations.value = []
      return
    }
    const { data } = await request(client.api.setting.conversations.$get({ query: { profile } }))
    conversations.value = data
    syncActiveConversation()
  }

  /**
   * loadConversations behind the sidebar skeleton (`inboxIsLoading`) -- for profile switches and pull-to-refresh.
   * Socket-driven refreshes call loadConversations directly so the visible list never flashes.
   */
  async function reloadInbox(): Promise<void> {
    inboxIsLoading.value = true
    try {
      await loadConversations()
    } finally {
      inboxIsLoading.value = false
    }
  }

  /** Re-point the open selection to its fresh row after a reload (updated contact data), or drop it if it's gone. */
  function syncActiveConversation(): void {
    const active = activeConversation.value
    if (!active) return
    activeConversation.value = conversations.value.find((c) => c._id === active._id) ?? null
  }

  /** Select a conversation, mark it read, and load its thread (then refresh the profile unread badges). */
  async function openConversation(conversation: Conversation): Promise<void> {
    activeConversation.value = conversation
    markRead(conversation._id)
    threadIsLoading.value = true
    try {
      await loadMessages(conversation)
    } finally {
      threadIsLoading.value = false
    }
    await Promise.all([profileStore.refreshActiveProfile(), profileStore.loadProfiles()])
  }

  /** Optimistically clear a row's unread badge; a later loadConversations reconciles with the server value. */
  function markRead(number: string): void {
    const row = conversations.value.find((c) => c._id === number)
    if (row) row.unread = 0
  }

  /** Re-fetch the open thread's messages in place (e.g. on an incoming-message socket event). No-op when none is open. */
  async function refreshMessages(): Promise<void> {
    if (activeConversation.value) await loadMessages(activeConversation.value)
  }

  /** Fetch a conversation's thread. Side effect: the server marks its messages as read (isview) */
  async function loadMessages(conversation: Conversation): Promise<void> {
    const { telnyx_number, _id } = conversation
    const { data } = await request(
      client.api.setting.conversations.messages.$post({
        json: { number: { telnyx_number, _id }, profile: profileStore.activeProfileId },
      }),
    )
    messages.value = data
  }

  /** Send an SMS/MMS to one or more numbers from the active profile, then refresh the inbox and open thread. */
  async function sendMessage(input: { numbers: string[]; message: string; media: string[] }): Promise<void> {
    const { numbers, message, media } = input
    await request(
      client.api.setting.messages.$post({
        json: { numbers, message, media, profile: { _id: profileStore.activeProfileId } },
      }),
    )
    await Promise.all([loadConversations(), refreshMessages()])
  }

  /** Delete the open conversation's thread, then clear the selection (it's gone) and refresh the inbox. No-op when none is open. */
  async function deleteActiveConversation(): Promise<void> {
    if (!activeRemoteNumber.value) return
    await request(client.api.setting.conversations[':number'].$delete({ param: { number: activeRemoteNumber.value } }))
    clearActiveConversation()
    await loadConversations()
  }

  /** Clear the selection and the open thread (fires on a profile switch). */
  function clearActiveConversation(): void {
    activeConversation.value = null
    messages.value = []
  }

  return {
    conversations,
    activeConversation,
    messages,
    threadIsLoading,
    inboxIsLoading,
    activeRemoteNumber,
    hasActiveConversation,
    loadConversations,
    reloadInbox,
    openConversation,
    refreshMessages,
    sendMessage,
    deleteActiveConversation,
    clearActiveConversation,
  }
})
