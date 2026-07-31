<template>
  <div class="wrap-chat">
    <div v-if="conversationStore.threadIsLoading" class="loading-bar">
      <div class="blue-bar"></div>
    </div>
    <div ref="chatContainer" class="chat" :class="{ 'opacity-0': conversationStore.threadIsLoading }">
      <div v-if="conversationStore.hasActiveConversation">
        <div v-for="message in conversationStore.messages" :key="message._id">
          <div
            class="chat-bubble"
            :class="{
              me: message.type === 'send',
              you: message.type === 'receive',
            }"
          >
            <div
              :class="{
                'my-mouth': message.type === 'send',
                'your-mouth': message.type === 'receive',
              }"
            ></div>
            <div class="content">
              <!-- Narrow the discriminated union: the call branch has `duration`, the text branch has `media`/`message`. -->
              <span v-if="message.datatype === 'call'">
                <span v-if="message.type === 'send'"> <IBiTelephoneOutboundFill />&nbsp;&nbsp; Outbound</span>
                <span v-else><IBiTelephoneInboundFill />&nbsp;&nbsp; Inbound</span>
                Call( {{ formatDuration(message.duration ?? 0) }} )
              </span>
              <template v-else>
                <span v-for="image in mediaUrls(message.media)" :key="image">
                  <!-- d-block w-100 keeps the img's 100% width resolving against the bubble -->
                  <button type="button" class="btn d-block w-100 p-0 border-0" @click="showImage(image)">
                    <img :src="image" alt="Image">
                  </button>
                </span>
                <span> {{ message.message }} </span>
              </template>
            </div>
            <div class="time">
              {{ formatTimestamp(message.created_at) }}
              <!-- January 1, 2000 10:00 AM -->
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div v-show="zoomImage" id="image-zoom-overlay" @click="hideImage()">
    <div class="d-flex justify-content-center align-items-center vh-100 vw-100">
      <img class="img-fluid" alt="Responsive image" :src="zoomImage">
    </div>
  </div>
</template>

<script setup lang="ts">
/** The open conversation's thread: SMS/MMS/call bubbles plus the image lightbox. Reads the conversation store and scrolls itself as messages arrive. */
import { nextTick, ref, useTemplateRef, watch } from 'vue'
import { formatDuration, formatTimestamp } from '@/helper.ts'
import { useConversationStore } from '@/stores/conversation.ts'

const conversationStore = useConversationStore()
const chatContainer = useTemplateRef<HTMLDivElement>('chatContainer')
const zoomImage = ref('')

function showImage(image: string) {
  zoomImage.value = image
}
function hideImage() {
  zoomImage.value = ''
}

/**
 * `media` is `string[]`, but legacy rows hold the whole array JSON-encoded in one string. A leading `[` can't begin a
 * URL scheme, so as a `src` it is a relative reference the browser resolves against the current route -- and those
 * uploads are gone from disk anyway, so drop it.
 */
function mediaUrls(media: string | string[] | undefined): string[] {
  if (!media) return []
  const list = Array.isArray(media) ? media : [media]
  return list.filter((url) => URL.canParse(url))
}

// Scroll only after Vue has flushed the new messages into the DOM; before nextTick the thread isn't
// rendered yet, so the container's scrollHeight is stale and we'd land mid-thread.
watch(
  () => conversationStore.messages,
  async () => {
    await nextTick()
    const container = chatContainer.value
    if (!container) return
    container.scroll({ top: container.scrollHeight })
  },
)
</script>

<style scoped>
#image-zoom-overlay {
  z-index: 9999;
  position: fixed;
  height: 100%;
  width: 100%;
  left: 0;
  top: 0;
  text-align: center;
  background-color: var(--background-color-secondary) !important;
}

.wrap-chat {
  height: calc(100dvh - 120px);
  display: flex;
}

.chat {
  background-color: var(--chat-background);
  width: 100%;
  padding: 0 7%;
  padding-top: 7px;
  overflow-y: auto;
}

.chat-bubble {
  border-radius: 7px;
  box-shadow: 2px 2px 10px rgba(70, 70, 70, 0.5);
  padding: 5px 7px;
  max-width: 100%;
  position: relative;
}

.you {
  background: var(--chat-you);
  margin: 0 auto 10px 0;
  text-align: left;
  width: max-content;
}

.me {
  background: var(--chat-me);
  margin: 0 0 10px auto;
  text-align: right;
  width: max-content;
  color: whitesmoke;
}

.your-mouth {
  width: 0;
  height: 0;
  border-bottom: 10px solid var(--chat-you);
  border-left: 10px solid transparent;
  position: absolute;
  bottom: 10px;
  left: -10px;
}

.my-mouth {
  width: 0;
  height: 0;
  border-bottom: 10px solid var(--chat-me);
  border-right: 10px solid transparent;
  position: absolute;
  bottom: 10px;
  left: 100%;
}

/* ------ CHAT: thread loading bar ------ */
.loading-bar {
  width: 50%;
  height: 2px;
  margin-left: -15%;
  border-radius: 2px;
  background-color: var(--chat-you);
  position: relative;
  top: 50%;
  left: 50%;
  overflow: hidden;
  z-index: 5;
  transform: rotateY(0);
  transition: transform 0.3s ease-in;
}
.loading-bar .blue-bar {
  height: 100%;
  width: 68px;
  position: absolute;
  transform: translate(-34px);
  background-color: var(--theme-orange);
  border-radius: 2px;
  animation: initial-loading 1.5s ease infinite;
}
@keyframes initial-loading {
  0% {
    transform: translate(-34px);
  }
  50% {
    transform: translate(96px);
  }
  to {
    transform: translate(-34px);
  }
}
</style>
