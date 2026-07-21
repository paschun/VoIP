import { socketMessage, type SocketMessage } from '@shared/contracts/socket.ts'
import { authToken } from '@/core/auth-token.ts'
import { showMessageNotification } from '@/core/notify.ts'
import { wsClient } from '@/core/rpc.client.ts'
import { useConversationStore } from '@/stores/conversation.ts'
import { useProfileStore } from '@/stores/profile.ts'

let socket: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let attempts = 0

/**
 * Open the app websocket (typed RPC `$ws`). The server pushes `SocketMessage`s for the JWT's user; every
 * incoming-message reaction (store refreshes + desktop notification) happens here. Reconnects with capped
 * exponential backoff until `disconnectSocket()`.
 */
export function connectSocket() {
  disconnectSocket()
  open()
}

function open() {
  const ws = wsClient.api.ws.$ws({ query: { token: authToken.value } })
  socket = ws
  ws.addEventListener('open', () => {
    attempts = 0
  })
  ws.addEventListener('message', (evt: MessageEvent<string>) => {
    let msg: SocketMessage
    try {
      msg = socketMessage.parse(JSON.parse(evt.data))
    } catch (e) {
      console.error('Ignoring malformed socket message', e)
      return
    }
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
  })
  ws.addEventListener('close', () => {
    if (socket !== ws) return // superseded, or closed by disconnectSocket
    const delay = Math.min(1000 * 2 ** attempts++, 30_000) // exponential backoff: 1s, 2s, 4s, ... capped at 30s
    reconnectTimer = setTimeout(() => open(), delay)
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
