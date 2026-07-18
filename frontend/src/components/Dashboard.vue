<template>
  <div class="wrap">
    <call-view></call-view>
    <theme-button id-hide="true"></theme-button>
    <!--
      Responsive offcanvas: below the `sm` breakpoint it's a slide-out drawer (opened by the chat-head
      hamburger via v-b-toggle.sidebar-no-header); at/above `sm` Bootstrap renders it inline as the static
      sidebar column
    -->
    <b-offcanvas id="sidebar-no-header" ref="mobileSidebar" class="col-auto col-md-4" responsive="sm" placement="start" no-header shadow>
      <template #default="{ hide }">
        <!-- .d-sm-none hides this row >= sm breakpoint -->
        <div class="d-flex flex-row-reverse bd-highlight d-sm-none">
          <div class="bd-highlight dropDown">
            <b-button class="float-right d-flex" size="sm" variant="primary">
              <i-bi-x @click="hide()" />
            </b-button>
          </div>
        </div>
        <number-list @messageSent="onMessageSent" />
      </template>
    </b-offcanvas>
    <section class="col col-md-8 pb-2">
      <div class="chat-head">
        <!-- hamburger / drawer-open icon hidden on larger screens (>= sm) where sidebar always visible -->
        <i-bi-chevron-left aria-hidden="true" class="mx-3 my-auto d-sm-none h2" style="font-size: 2em" v-b-toggle.sidebar-no-header />
        <i-bi-person-bounding-box aria-hidden="true" class="mx-2 my-auto" style="font-size: 2em" />
        <div class="chat-name">
          <h1 class="font-name" v-if="conversationStore.activeConversation">
            <div class="d-flex align-items-start align-self-center" v-if="conversationStore.activeConversation.contact">
              <div class="mt-2 ml-4">
                {{ conversationStore.activeConversation.contact.first_name }}
                {{ conversationStore.activeConversation.contact.last_name }}
              </div>
            </div>
            <div class="d-flex align-items-start align-self-center">
              <div class="mt-2 ml-4">{{ conversationStore.activeRemoteNumber }}</div>
              &nbsp;&nbsp;&nbsp;
              <span
                style="cursor: copy"
                title="Add Contact"
                @click="contactStore.startCreate(conversationStore.activeRemoteNumber)"
                v-if="!conversationStore.activeConversation.contact"
              >
                <i-bi-plus-circle aria-hidden="true" style="font-size: 1.5em" />
              </span>
            </div>
          </h1>
        </div>
        <div class="d-flex m-auto" v-if="conversationStore.hasActiveConversation">
          <span style="cursor: pointer" @click="callStore.dial(conversationStore.activeRemoteNumber)" title="Call">
            <i-bi-telephone aria-hidden="true" style="font-size: 2em" />
          </span>
          &nbsp;&nbsp;&nbsp;
          <span style="cursor: pointer" @click="deleteChat()" title="Delete">
            <i-bi-trash aria-hidden="true" style="font-size: 2em" />
          </span>
        </div>
      </div>
      <chat-thread />
      <message-composer @sent="onMessageSent" />
    </section>
  </div>
</template>

<script lang="ts">
/** Main messaging view: conversation list (NumberList), the chat thread + composer, the compose SMS/MMS modal, and the call tab. */
import { defineComponent, useTemplateRef } from 'vue'
import type { BOffcanvas } from 'bootstrap-vue-next'
import CallView from '@/components/CallView.vue'
import ChatThread from '@/components/ChatThread.vue'
import MessageComposer from '@/components/MessageComposer.vue'
import ThemeButton from '@/components/ThemeButton.vue'
import { connectSocket, disconnectSocket } from '@/core/socket.ts'
import { confirmDelete } from '@/helper.ts'
import { appDirectory } from '@/router/helpers.ts'
import { useCallStore } from '@/stores/call.ts'
import { useContactStore } from '@/stores/contact.ts'
import { useConversationStore } from '@/stores/conversation.ts'
import { useUserStore } from '@/stores/user.ts'
import NumberList from './inbox/NumberList.vue'

export default defineComponent({
  name: 'DashboardView',
  components: {
    NumberList,
    ThemeButton,
    CallView,
    ChatThread,
    MessageComposer,
  },
  setup() {
    const mobileSidebar = useTemplateRef<InstanceType<typeof BOffcanvas>>('mobileSidebar')
    return {
      userStore: useUserStore(),
      conversationStore: useConversationStore(),
      contactStore: useContactStore(),
      callStore: useCallStore(),
      mobileSidebar,
    }
  },
  mounted() {
    if (!this.userStore.isLoggedIn) {
      // Bounce to the login page inside the current directory -- never bare `/`, which the server gate 404s.
      this.$router.push({ name: 'login', params: { appdirectory: appDirectory(this.$route) } })
      return
    }
    connectSocket()
  },
  unmounted() {
    disconnectSocket()
  },
  watch: {
    // A conversation was opened: drop the mobile sidebar drawer to reveal the chat pane.
    'conversationStore.activeRemoteNumber'(number: string) {
      if (number) this.mobileSidebar?.hide()
    },
  },
  methods: {
    /** A send may have created the first thread for a number; drop the mobile sidebar to reveal it. */
    onMessageSent() {
      this.mobileSidebar?.hide()
    },
    async deleteChat() {
      if (!(await confirmDelete('Do you want to delete this chat?', 'chat not deleted'))) return
      await this.conversationStore.deleteActiveConversation()
    },
  },
})
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
  box-shadow: 0px 0px 2px 0px #aaa;
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
