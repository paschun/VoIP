<template>
  <div>
    <div class="wrap-search">
      <div class="search">
        <i class="fa fa-search fa" aria-hidden="true"></i>
        <input type="text" class="input-search" v-model="query" placeholder="Search" />
      </div>
    </div>
    <div class="contact-list">
      <div class="box-placeholder" v-if="conversationStore.inboxIsLoading">
        <div class="p-4">
          <span class="category text link"></span>
          <h4 class="text line"></h4>
          <h4 class="text"></h4>
        </div>
        <hr />
        <div class="image">
          <div class="embed-responsive embed-responsive-16by9"></div>
        </div>
        <hr />
        <div class="excerpt p-4">
          <div class="text line"></div>
          <div class="text line"></div>
          <div class="text"></div>
        </div>
        <hr />
        <div class="excerpt p-4">
          <div class="text line"></div>
          <div class="text line"></div>
          <div class="text"></div>
        </div>
      </div>
      <template v-if="!conversationStore.inboxIsLoading">
        <div
          v-for="item in searchNumbers"
          :key="item._id"
          class="contact"
          :id="`phone${item._id}`"
          v-on:click="conversationStore.openConversation(item)"
          v-bind:class="{ activeChat: conversationStore.activeRemoteNumber == item._id }"
        >
          <i-bi-person-bounding-box aria-hidden="true" class="mx-2 my-auto" style="font-size: 2em" />
          <div class="d-flex justify-content-between" style="width: 100%">
            <div class="contact-preview">
              <div class="contact-text">
                <h1 class="font-name" v-if="item.contact">{{ item.contact.first_name }} {{ item.contact.last_name }}</h1>
                <h1 v-else class="font-name">{{ item._id }}</h1>
                <p class="font-preview" v-if="item.message">
                  {{ getValidString(item.message) }}
                </p>
                <p class="font-preview" v-else>
                  <span v-if="item.message_type == 'call'">
                    <span v-if="item.type == 'send'"> Outbound </span>
                    <span v-else> Inbound </span>
                    Call
                  </span>
                </p>
              </div>
            </div>

            <div class="align-self-center text-end me-3">
              <span class="time">{{ formatTimestamp(item.created_at, false) }}</span>
              <!-- Jan 1, 2000 10:00 AM -->
              <span class="badge message_count bg-success" :id="item._id" v-if="item.unread > 0">{{ item.unread }}</span>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
/** The inbox sidebar: search box, loading skeleton, and conversation rows. Selection is a pure store call. */
import { computed, onMounted, ref } from 'vue'
import PullToRefresh from 'pulltorefreshjs'
import { formatTimestamp } from '@/helper.ts'
import { useConversationStore } from '@/stores/conversation.ts'
import { useProfileStore } from '@/stores/profile.ts'

function getValidString(str: string): string {
  return str.length > 10 ? str.substring(0, 10) + '..' : str
}

const conversationStore = useConversationStore()
const profileStore = useProfileStore()
const query = ref('')

// Inbox rows filtered by the search box. Derives from the store list so it tracks loads/socket refreshes.
const searchNumbers = computed(() => {
  const search = new RegExp(query.value, 'i')
  return conversationStore.conversations.filter(
    (item) =>
      search.test(item._id) || search.test(item.contact?.first_name ?? '') || search.test(item.contact?.last_name ?? '') || search.test(item.message ?? ''),
  )
})

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
</style>
