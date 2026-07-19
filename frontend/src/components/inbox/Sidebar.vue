<template>
  <div>
    <div class="profile">
      <div class="d-flex flex-row bd-highlight align-items-center align-self-center">
        <div class="mt-2">
          <div class="d-flex flex-row bd-highlight">
            <setting></setting>
            <div class="bd-highlight">
              <contact-list></contact-list>
            </div>
            <div class="bd-highlight">
              <i-bi-telephone aria-hidden="true" class="m-2" title="Call" v-b-modal.call-modal style="cursor: pointer" />
            </div>
            <div class="bd-highlight">
              <i-bi-pencil-square @click="composeModal?.open()" aria-hidden="true" class="m-2" title="Compose" style="cursor: pointer" />
            </div>
          </div>
        </div>
        <profile-dropdown />
      </div>
    </div>
    <conversation-list />
    <compose-message-modal ref="composeModal" @sent="$emit('messageSent')" />
  </div>
</template>

<script lang="ts">
/** The sidebar column: header icon row (settings, contacts, call, compose), the profile dropdown, and the inbox list. */
import { defineComponent, useTemplateRef } from 'vue'
import ComposeMessageModal from '@/components/ComposeMessageModal.vue'
import ContactList from '@/components/setting/ContactList.vue'
import Setting from '@/components/setting/Setting.vue'
import { useContactStore } from '@/stores/contact.ts'
import ConversationList from './ConversationList.vue'
import ProfileDropdown from './ProfileDropdown.vue'

export default defineComponent({
  name: 'InboxSidebar',
  emits: ['messageSent'],
  components: {
    ContactList,
    Setting,
    ComposeMessageModal,
    ConversationList,
    ProfileDropdown,
  },
  setup() {
    const composeModal = useTemplateRef<InstanceType<typeof ComposeMessageModal>>('composeModal')
    return { contactStore: useContactStore(), composeModal }
  },
  mounted() {
    void this.contactStore.loadContacts()
  },
})
</script>
