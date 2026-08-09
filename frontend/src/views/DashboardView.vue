<template>
  <div class="wrap">
    <!--
      Responsive offcanvas: below the `md` breakpoint it's a slide-out drawer (opened by the chat-head
      hamburger via v-b-toggle); at/above `md` Bootstrap renders it inline as the static
      sidebar column. The breakpoint must match the first `col-*` width, or the inline column shrink-wraps its content.
      The column is 5/12 so the header icon row still fits at md (~320px), capped at 400px since nothing needs more.
      p-1 trims the drawer's 1rem body padding; h-100 + flex column hand the scroll to the conversation list.
    -->
    <BOffcanvas
      :id="MOBILE_SIDEBAR_ID"
      :visible="isS"
      class="col-md-5 sidebar-col"
      responsive="md"
      placement="start"
      body-class="p-1 h-100 d-flex flex-column"
      no-header
      shadow
    >
      <template #default="{ hide }">
        <!-- .d-md-none hides this row >= md breakpoint -->
        <div class="d-flex flex-row-reverse d-md-none">
          <BCloseButton class="m-1" aria-label="Close sidebar" @click="hide()" />
        </div>
        <SidebarPanel />
      </template>
    </BOffcanvas>
    <ChatPane />
    <CallModal />
  </div>
</template>

<script setup lang="ts">
/** Main messaging view: the sidebar (conversation list), the chat pane, and the call tab. */
import { breakpointsBootstrapV5, onKeyStroke, useBreakpoints } from '@vueuse/core'
import CallModal from '@/components/call/CallModal.vue'
import ChatPane from '@/components/chat/ChatPane.vue'
import { useConversationRoute } from '@/composables/useConversationRoute.ts'
import { MOBILE_SIDEBAR_ID } from '@/composables/useMobileSidebar.ts'
import { useServerEvents } from '@/composables/useServerEvents.ts'
import { setupPush } from '@/core/push.ts'
import { useConversationStore } from '@/stores/conversation.ts'
import SidebarPanel from '@/components/sidebar/SidebarPanel.vue'

const conversationStore = useConversationStore()

const breakpoints = useBreakpoints(breakpointsBootstrapV5)
// Below `md` the drawer starts open, so a fresh load lands on the conversation list.
const isS = breakpoints.isSmaller('md') // 768px

/** True while a BVN modal/offcanvas/dropdown or a swal dialog is open (each closes itself on Escape). */
function hasOpenOverlay(): boolean {
  return document.querySelector('.modal.show, .offcanvas.show, .dropdown-menu.show, .swal2-popup') !== null
}

// Escape closes the open thread, unless an overlay owns the key.
onKeyStroke('Escape', (e) => {
  if (e.isComposing || hasOpenOverlay()) return
  conversationStore.clearActiveConversation()
})

useConversationRoute()
// Opens the SSE push stream now and closes it when this view unmounts (its scope disposes).
useServerEvents()
void setupPush()
</script>

<!-- Unscoped: a scoped selector would not reach BOffcanvas's root element. -->
<style>
/* The sidebar column needs no more than 400px. `min()` keeps the cap off the drawer's own `max-width: 100%`, which
   would otherwise overflow a phone narrower than that. */
.sidebar-col {
  max-width: min(400px, 100%);
}
</style>

<style scoped>
/* Outer app container */
.wrap {
  display: flex;
  flex-grow: 1;
  height: 100dvh;
  max-width: 1400px;
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
</style>
