import { io, type Socket } from 'socket.io-client'
import { useConversationStore } from '@/stores/conversation.ts'
import { useProfileStore } from '@/stores/profile.ts'

/** The slice of the backend's `user_message` payload the frontend consumes (inbound SMS/MMS and call-log changes). */
export type UserMessage = { number: string; message: string }

let socket: Socket | null = null

/**
 * Open the app's socket.io connection (same-origin, see vite.config.ts for the dev websocket proxy), join the user's
 * channel, and refresh the stores on incoming events. `onUserMessage` is the UI hook: it fires after the store
 * refreshes for each `user_message` (e.g. desktop notification). Reconnects fresh if already connected.
 */
export function connectSocket(userId: string, onUserMessage: (data: UserMessage) => void) {
  disconnectSocket()
  socket = io({ transports: ['websocket'] })
  socket.emit('join_profile_channel', userId)
  socket.on('user_message', (data: UserMessage) => {
    const conversationStore = useConversationStore()
    if (conversationStore.hasActiveConversation) {
      void conversationStore.refreshMessages()
    } else {
      void useProfileStore().refreshActiveProfile()
    }
    void conversationStore.loadConversations()
    onUserMessage(data)
  })
}

export function disconnectSocket() {
  socket?.disconnect()
  socket = null
}
