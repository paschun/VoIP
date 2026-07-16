import type { SocketMessage } from '@shared/contracts/socket.ts'
import { authToken } from '@/core/auth-token.ts'
import { wsClient } from '@/core/rpc.client.ts'
import { useConversationStore } from '@/stores/conversation.ts'
import { useProfileStore } from '@/stores/profile.ts'

export type { SocketMessage }

let socket: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let attempts = 0

/**
 * Open the app websocket (typed RPC `$ws`). The server pushes `SocketMessage`s for the JWT's user; store refreshes
 * happen here and `onUserMessage` is the UI hook (notification, sidebar refresh). Reconnects with capped exponential
 * backoff until `disconnectSocket()`.
 */
export function connectSocket(onUserMessage: (msg: SocketMessage) => void) {
  disconnectSocket()
  open(onUserMessage)
}

function open(onUserMessage: (msg: SocketMessage) => void) {
  const ws = wsClient.api.ws.$ws({ query: { token: authToken.value } })
  socket = ws
  ws.addEventListener('open', () => {
    attempts = 0
  })
  ws.addEventListener('message', (evt) => {
    const msg: SocketMessage = JSON.parse(evt.data)
    if (msg.event !== 'user_message') return
    const conversationStore = useConversationStore()
    if (conversationStore.hasActiveConversation) {
      void conversationStore.refreshMessages()
    } else {
      void useProfileStore().refreshActiveProfile()
    }
    void conversationStore.loadConversations()
    onUserMessage(msg)
  })
  ws.addEventListener('close', () => {
    if (socket !== ws) return // superseded, or closed by disconnectSocket
    const delay = Math.min(1000 * 2 ** attempts++, 30_000) // exponential backoff: 1s, 2s, 4s, ... capped at 30s
    reconnectTimer = setTimeout(() => open(onUserMessage), delay)
  })
}

export function disconnectSocket() {
  if (reconnectTimer) clearTimeout(reconnectTimer)
  reconnectTimer = null
  attempts = 0
  const ws = socket
  socket = null // cleared before close() so the close listener sees an intentional close and doesn't reconnect
  ws?.close()
}
