<template>
  <div class="chat-head">
    <!-- hamburger / drawer-open icon hidden on larger screens (>= md) where sidebar always visible -->
    <IBiChevronLeft v-b-toggle="MOBILE_SIDEBAR_ID" aria-hidden="true" class="mx-3 d-md-none flex-shrink-0" style="font-size: 2em" />
    <IBiPersonBoundingBox aria-hidden="true" class="mx-2 flex-shrink-0" style="font-size: 1.5em" />
    <div class="chat-name">
      <template v-if="conversationStore.activeConversation">
        <div class="d-flex align-items-center gap-2">
          <h1 class="fs-6 fw-normal mb-0">{{ chatTitle }}</h1>
          <span
            v-if="!conversationStore.activeConversation.contact"
            class="cursor-copy"
            title="Add Contact"
            @click="contactStore.startCreate(conversationStore.activeRemoteNumber)"
          >
            <IBiPlusCircle aria-hidden="true" style="font-size: 1.5em" />
          </span>
        </div>
        <div v-if="conversationStore.activeConversation.contact">{{ conversationStore.activeRemoteNumber }}</div>
      </template>
    </div>
    <div v-if="conversationStore.hasActiveConversation" class="d-flex flex-shrink-0">
      <span class="cursor-pointer" title="Call" @click="callStore.dial(conversationStore.activeRemoteNumber)">
        <IBiTelephone aria-hidden="true" style="font-size: 2em" />
      </span>
      &nbsp;&nbsp;&nbsp;
      <span class="cursor-pointer" title="Delete" @click="deleteChat()">
        <IBiTrash aria-hidden="true" style="font-size: 2em" />
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
/** Header of the open conversation: contact name/number, add-contact, call and delete actions, and the sidebar drawer toggle. */
import { computed } from 'vue'
import { MOBILE_SIDEBAR_ID } from '@/composables/useMobileSidebar.ts'
import { confirmDelete } from '@/helper.ts'
import { useCallStore } from '@/stores/call.ts'
import { useContactStore } from '@/stores/contact.ts'
import { useConversationStore } from '@/stores/conversation.ts'

const conversationStore = useConversationStore()
const contactStore = useContactStore()
const callStore = useCallStore()

/** The contact's name, falling back to the raw number when the conversation has no contact. */
const chatTitle = computed(() => {
  const contact = conversationStore.activeConversation?.contact
  return contact ? `${contact.first_name} ${contact.last_name}` : conversationStore.activeRemoteNumber
})

async function deleteChat() {
  if (!(await confirmDelete('Do you want to delete this chat?', 'chat not deleted'))) return
  await conversationStore.deleteActiveConversation()
}
</script>

<style scoped>
.chat-head {
  background-color: var(--background-color-secondary);
  width: 100%;
  height: 60px;
  display: flex;
  align-items: center;
  padding-right: 25px;
}
.chat-name {
  width: 100%;
  line-height: 1.25;
}
.cursor-copy {
  cursor: copy;
}
</style>
