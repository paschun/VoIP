<template>
  <div class="fill-column">
    <SearchBar v-model="query" />
    <div ref="list" class="contact-list">
      <ListSkeleton v-if="conversationStore.inboxIsLoading" />
      <template v-if="!conversationStore.inboxIsLoading">
        <div
          v-for="item in searchNumbers"
          :key="item._id"
          class="contact"
          :class="{ 'active-chat': conversationStore.activeRemoteNumber === item._id }"
          @click="selectConversation(item)"
        >
          <IBiPersonBoundingBox aria-hidden="true" class="mx-2 flex-shrink-0" style="font-size: 1.5em" />
          <div class="d-flex align-items-center justify-content-between w-100">
            <div class="contact-preview">
              <div class="contact-text">
                <div v-if="item.contact" class="conversation-name">{{ item.contact.first_name }} {{ item.contact.last_name }}</div>
                <div v-else class="conversation-name">{{ item._id }}</div>
                <p v-if="item.message" class="message-preview">
                  {{ getValidString(item.message) }}
                </p>
                <p v-else class="message-preview">
                  <span v-if="item.message_type === 'call'">
                    <span v-if="item.type === 'send'"> Outbound </span>
                    <span v-else> Inbound </span>
                    Call
                  </span>
                </p>
              </div>
            </div>

            <div class="text-end me-3">
              <span class="timestamp">{{ formatTimestamp(item.created_at, false) }}</span>
              <!-- Jan 1, 2000 10:00 AM -->
              <span v-if="item.unread > 0" class="badge bg-success">{{ item.unread }}</span>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
/** The inbox sidebar: search box, loading skeleton, and conversation rows. Selection is a pure store call. */
import { onMounted, onUnmounted, useTemplateRef } from 'vue'
import PullToRefresh, { type PullToRefreshInstance } from 'pulltorefreshjs'
import ListSkeleton from '@/components/shared/ListSkeleton.vue'
import SearchBar from '@/components/shared/SearchBar.vue'
import { useMobileSidebar } from '@/composables/useMobileSidebar.ts'
import { useSearchFilter } from '@/composables/useSearchFilter.ts'
import { formatTimestamp } from '@/helper.ts'
import { type Conversation, useConversationStore } from '@/stores/conversation.ts'
import { useProfileStore } from '@/stores/profile.ts'

function getValidString(str: string): string {
  const maxLen = 15
  return str.length > maxLen ? str.substring(0, maxLen) + '..' : str
}

const listElement = useTemplateRef<HTMLElement>('list')
const conversationStore = useConversationStore()
const profileStore = useProfileStore()
const { closeSidebar } = useMobileSidebar()

/** Closes the drawer on every click, including a re-select of the already open row. */
function selectConversation(conversation: Conversation): void {
  closeSidebar()
  void conversationStore.openConversation(conversation)
}

// Inbox rows filtered by the search box. Derives from the store list so it tracks loads/socket refreshes.
const { query, results: searchNumbers } = useSearchFilter(
  () => conversationStore.conversations,
  ({ _id, contact, message }) => [_id, contact?.first_name, contact?.last_name, message],
)

function pullRefreshFunction() {
  void conversationStore.reloadInbox()
  void profileStore.refreshActiveProfile()
  void profileStore.loadProfiles()
}

let pullToRefresh: PullToRefreshInstance | undefined

onMounted(() => {
  pullToRefresh = PullToRefresh.init({
    mainElement: '.contact-list',
    triggerElement: '.contact-list',
    onRefresh: () => pullRefreshFunction(),
    // Dont refresh from just scrolling the list. Require user to scroll-up when already at the top
    shouldPullToRefresh: () => !listElement.value?.scrollTop,
  })
})
onUnmounted(() => {
  pullToRefresh?.destroy()
})
</script>

<style scoped>
.contact {
  height: 70px;
  background-color: var(--contact-highlighted);
  border-bottom: 1px solid var(--divider-color);
  display: flex;
  align-items: center;
  cursor: pointer;
}
.contact:hover {
  background-color: var(--contact-hover);
}
.active-chat {
  background-color: var(--contact-highlighted);
  /* Shadow, not a border: it paints the bar without taking layout width, so selecting never shifts the row's content. */
  box-shadow: inset -3px 0 0 var(--theme-orange);
}
.contact-preview {
  width: 100%;
  height: 70px;
  display: flex;
  align-items: center;
  overflow: hidden;
}
.contact-text {
  height: 40px;
}
.conversation-name {
  line-height: 0.5rem;
  margin-bottom: 0.5rem;
}
.message-preview {
  font-size: 0.8em;
  line-height: 1.2rem;
  font-weight: inherit;
}
/* Owns the sidebar's scroll; `contain` keeps the overscroll off the page (pull-to-refresh, rubber-banding). */
.contact-list {
  background-color: var(--contact-list);
  width: 100%;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}

</style>
