<template>
  <div>
    <div class="wrap-search">
      <div class="search">
        <i class="fa fa-search fa" aria-hidden="true"></i>
        <input v-model="query" type="text" class="input-search" placeholder="Search">
      </div>
    </div>
    <div class="contact-list">
      <div v-if="conversationStore.inboxIsLoading" class="box-placeholder">
        <div class="p-4">
          <span class="category text link"></span>
          <h4 class="text line"></h4>
          <h4 class="text"></h4>
        </div>
        <hr>
        <div class="image">
          <div class="embed-responsive embed-responsive-16by9"></div>
        </div>
        <hr>
        <div class="excerpt p-4">
          <div class="text line"></div>
          <div class="text line"></div>
          <div class="text"></div>
        </div>
        <hr>
        <div class="excerpt p-4">
          <div class="text line"></div>
          <div class="text line"></div>
          <div class="text"></div>
        </div>
      </div>
      <template v-if="!conversationStore.inboxIsLoading">
        <div
          v-for="item in searchNumbers"
          :id="`phone${item._id}`"
          :key="item._id"
          class="contact"
          :class="{ 'active-chat': conversationStore.activeRemoteNumber === item._id }"
          @click="conversationStore.openConversation(item)"
        >
          <IBiPersonBoundingBox aria-hidden="true" class="mx-2 my-auto" style="font-size: 2em" />
          <div class="d-flex justify-content-between w-100">
            <div class="contact-preview">
              <div class="contact-text">
                <h1 v-if="item.contact" class="font-name">{{ item.contact.first_name }} {{ item.contact.last_name }}</h1>
                <h1 v-else class="font-name">{{ item._id }}</h1>
                <p v-if="item.message" class="font-preview">
                  {{ getValidString(item.message) }}
                </p>
                <p v-else class="font-preview">
                  <span v-if="item.message_type === 'call'">
                    <span v-if="item.type === 'send'"> Outbound </span>
                    <span v-else> Inbound </span>
                    Call
                  </span>
                </p>
              </div>
            </div>

            <div class="align-self-center text-end me-3">
              <span class="time">{{ formatTimestamp(item.created_at, false) }}</span>
              <!-- Jan 1, 2000 10:00 AM -->
              <span v-if="item.unread > 0" :id="item._id" class="badge message_count bg-success">{{ item.unread }}</span>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
/** The inbox sidebar: search box, loading skeleton, and conversation rows. Selection is a pure store call. */
import { onMounted } from 'vue'
import PullToRefresh from 'pulltorefreshjs'
import { useSearchFilter } from '@/composables/useSearchFilter.ts'
import { formatTimestamp } from '@/helper.ts'
import { useConversationStore } from '@/stores/conversation.ts'
import { useProfileStore } from '@/stores/profile.ts'

function getValidString(str: string): string {
  return str.length > 10 ? str.substring(0, 10) + '..' : str
}

const conversationStore = useConversationStore()
const profileStore = useProfileStore()

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

onMounted(() => {
  PullToRefresh.init({
    mainElement: '.contact-list',
    triggerElement: '.contact-list',
    onRefresh: () => pullRefreshFunction(),
    distThreshold: 120,
    distMax: 140,
  })
})
</script>

<style scoped>
.contact {
  cursor: pointer;
}
.contact-list {
  min-height: calc(100vh - 105px);
}

/* Inbox loading skeleton. */
.box-placeholder {
  display: inline-block;
  background-color: var(--contact-list);
  margin: 30px;
  box-shadow: 0 2px 3px 0 rgba(0, 0, 0, 0.1);
  max-width: 300px;
  vertical-align: top;
  font-size: 0;
  line-height: 0;
}
.box-placeholder hr {
  margin: 0;
  border-color: #f3f3f3;
}
.box-placeholder .text {
  display: inline-block;
  background-color: #444;
  height: 12px;
  border-radius: 100px;
  margin: 5px 0;
  min-width: 100px;
  opacity: 0.1;
  animation: fading 1.5s infinite;
}
.box-placeholder .text:first-child {
  margin-top: 0;
}
.box-placeholder .text:last-child {
  margin-bottom: 0;
}
.box-placeholder .text.link {
  background-color: var(--blue);
  opacity: 0.4;
}
.box-placeholder .text.line {
  width: 100%;
}
.box-placeholder .text.category {
  width: 100px;
  margin-bottom: 10px;
}
.box-placeholder h4.text {
  height: 20px;
  margin: 3px 0;
  opacity: 0.2;
}
.box-placeholder .image {
  background-color: #f9f9f9;
}
@keyframes fading {
  0% {
    opacity: 0.1;
  }
  50% {
    opacity: 0.2;
  }
  100% {
    opacity: 0.1;
  }
}
</style>
