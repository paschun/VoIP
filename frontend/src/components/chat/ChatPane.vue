<template>
  <section class="col pb-2">
    <ChatHead />
    <ChatThread />
    <MessageComposer />
  </section>
</template>

<script setup lang="ts">
/** The open conversation: its header, thread, and composer. */
import ChatHead from '@/components/chat/ChatHead.vue'
import ChatThread from '@/components/chat/ChatThread.vue'
import MessageComposer from '@/components/chat/MessageComposer.vue'
</script>

<style scoped>
/* Takes whatever the sidebar leaves; `min-width` lifts the min-content floor that would otherwise overflow `.wrap`. */
section {
  min-width: 0;
}
</style>
