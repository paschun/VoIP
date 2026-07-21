<template>
  <div class="wrap">
    <CallView></CallView>
    <!--
      Responsive offcanvas: below the `sm` breakpoint it's a slide-out drawer (opened by the chat-head
      hamburger via v-b-toggle.sidebar-no-header); at/above `sm` Bootstrap renders it inline as the static
      sidebar column
    -->
    <BOffcanvas id="sidebar-no-header" ref="mobileSidebar" class="col-auto col-md-4" responsive="sm" placement="start" no-header shadow>
      <template #default="{ hide }">
        <!-- .d-sm-none hides this row >= sm breakpoint -->
        <div class="d-flex flex-row-reverse bd-highlight d-sm-none">
          <div class="bd-highlight drop-down">
            <BButton class="float-right d-flex" size="sm" variant="primary">
              <IBiX @click="hide()" />
            </BButton>
          </div>
        </div>
        <SidebarPanel @message-sent="onMessageSent" />
      </template>
    </BOffcanvas>
    <section class="col col-md-8 pb-2">
      <div class="chat-head">
        <!-- hamburger / drawer-open icon hidden on larger screens (>= sm) where sidebar always visible -->
        <IBiChevronLeft v-b-toggle.sidebar-no-header aria-hidden="true" class="mx-3 my-auto d-sm-none h2" style="font-size: 2em" />
        <IBiPersonBoundingBox aria-hidden="true" class="mx-2 my-auto" style="font-size: 2em" />
        <div class="chat-name">
          <h1 v-if="conversationStore.activeConversation" class="font-name">
            <div v-if="conversationStore.activeConversation.contact" class="d-flex align-items-start align-self-center">
              <div class="mt-2 ml-4">
                {{ conversationStore.activeConversation.contact.first_name }}
                {{ conversationStore.activeConversation.contact.last_name }}
              </div>
            </div>
            <div class="d-flex align-items-start align-self-center">
              <div class="mt-2 ml-4">{{ conversationStore.activeRemoteNumber }}</div>
              &nbsp;&nbsp;&nbsp;
              <span
                v-if="!conversationStore.activeConversation.contact"
                class="cursor-copy"
                title="Add Contact"
                @click="contactStore.startCreate(conversationStore.activeRemoteNumber)"
              >
                <IBiPlusCircle aria-hidden="true" style="font-size: 1.5em" />
              </span>
            </div>
          </h1>
        </div>
        <div v-if="conversationStore.hasActiveConversation" class="d-flex m-auto">
          <span class="cursor-pointer" title="Call" @click="callStore.dial(conversationStore.activeRemoteNumber)">
            <IBiTelephone aria-hidden="true" style="font-size: 2em" />
          </span>
          &nbsp;&nbsp;&nbsp;
          <span class="cursor-pointer" title="Delete" @click="deleteChat()">
            <IBiTrash aria-hidden="true" style="font-size: 2em" />
          </span>
        </div>
      </div>
      <ChatThread />
      <MessageComposer @sent="onMessageSent" />
    </section>
  </div>
</template>

<script setup lang="ts">
/** Main messaging view: the sidebar (conversation list), the chat thread + composer, the compose SMS/MMS modal, and the call tab. */
import { onMounted, onUnmounted, useTemplateRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { BOffcanvas } from 'bootstrap-vue-next'
import CallView from '@/components/call/CallView.vue'
import ChatThread from '@/components/chat/ChatThread.vue'
import MessageComposer from '@/components/chat/MessageComposer.vue'
import { connectSocket, disconnectSocket } from '@/core/socket.ts'
import { confirmDelete } from '@/helper.ts'
import { useCallStore } from '@/stores/call.ts'
import { useContactStore } from '@/stores/contact.ts'
import { useConversationStore } from '@/stores/conversation.ts'
import { useUserStore } from '@/stores/user.ts'
import SidebarPanel from '@/components/sidebar/SidebarPanel.vue'


const router = useRouter()
const userStore = useUserStore()
const conversationStore = useConversationStore()
const contactStore = useContactStore()
const callStore = useCallStore()
const mobileSidebar = useTemplateRef<InstanceType<typeof BOffcanvas>>('mobileSidebar')

/** A send may have created the first thread for a number; drop the mobile sidebar to reveal it. */
function onMessageSent() {
  void mobileSidebar.value?.hide()
}
async function deleteChat() {
  if (!(await confirmDelete('Do you want to delete this chat?', 'chat not deleted'))) return
  await conversationStore.deleteActiveConversation()
}

// A 401 mid-session clears the token; bounce to login (the appdirectory param is inherited from the current route).
// Entry while logged out is already blocked by the router's beforeEach guard.
watch(
  () => userStore.isLoggedIn, // Pinia unwraps refs/computeds when you access them on the store instance
  (loggedIn) => {
    if (!loggedIn) void router.push({ name: 'login' })
  },
)

onMounted(() => {
  connectSocket()
})
onUnmounted(() => {
  disconnectSocket()
})
// A conversation was opened: drop the mobile sidebar drawer to reveal the chat pane.
watch(
  () => conversationStore.activeRemoteNumber,
  (number: string) => {
    if (number) void mobileSidebar.value?.hide()
  },
)
</script>

<style scoped>
/* Outer app container */
.wrap {
  display: flex;
  flex-grow: 1;
  height: 100dvh;
  max-width: 1200px;
  border-radius: 10px;
  overflow: hidden;
  margin: auto;
  box-shadow: 0 0 2px 0 #aaa;
}
@media only screen and (max-width: 768px) {
  .wrap {
    margin-bottom: auto !important;
  }
}

/* ------ RIGHT SIDE ------ */
.chat-head {
  background-color: var(--background-color-secondary);
  width: 100%;
  height: 60px;
  display: flex;
  padding-right: 25px;
}
.chat-head i {
  color: #aaaaaa;
  width: 60px;
  margin: auto;
  text-align: center;
}
.chat-name {
  width: 100%;
  margin: auto;
}
</style>
