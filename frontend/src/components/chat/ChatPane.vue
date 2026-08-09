<template>
  <section class="col pb-2">
    <div class="chat-head">
      <!-- hamburger / drawer-open icon hidden on larger screens (>= md) where sidebar always visible -->
      <IBiChevronLeft v-b-toggle="MOBILE_SIDEBAR_ID" aria-hidden="true" class="mx-3 my-auto d-md-none h2" style="font-size: 2em" />
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
    <MessageComposer />
  </section>
</template>

<script setup lang="ts">
/** The open conversation: header (name/number, add-contact, call, delete), the thread, and the composer. */
import ChatThread from '@/components/chat/ChatThread.vue'
import MessageComposer from '@/components/chat/MessageComposer.vue'
import { MOBILE_SIDEBAR_ID } from '@/composables/useMobileSidebar.ts'
import { confirmDelete } from '@/helper.ts'
import { useCallStore } from '@/stores/call.ts'
import { useContactStore } from '@/stores/contact.ts'
import { useConversationStore } from '@/stores/conversation.ts'

const conversationStore = useConversationStore()
const contactStore = useContactStore()
const callStore = useCallStore()

async function deleteChat() {
  if (!(await confirmDelete('Do you want to delete this chat?', 'chat not deleted'))) return
  await conversationStore.deleteActiveConversation()
}
</script>

<style scoped>
/* Takes whatever the sidebar leaves; `min-width` lifts the min-content floor that would otherwise overflow `.wrap`. */
section {
  min-width: 0;
}

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
