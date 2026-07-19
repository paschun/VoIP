<template>
  <div>
    <div class="profile">
      <div class="d-flex flex-row bd-highlight align-items-center align-self-center">
        <div class="mt-2">
          <!-- v-b-toggle ids target the offcanvas panels mounted at the bottom of this template -->
          <div class="d-flex flex-row bd-highlight">
            <div class="bd-highlight">
              <i-bi-gear-fill aria-hidden="true" class="m-2" title="Settings" v-b-toggle.sidebar-email-setting style="cursor: pointer" />
            </div>
            <div class="bd-highlight">
              <i-bi-person-lines-fill aria-hidden="true" class="m-2" title="Contacts" v-b-toggle.sidebar-right style="cursor: pointer" />
            </div>
            <div class="bd-highlight">
              <i-bi-telephone aria-hidden="true" class="m-2" title="Call" v-b-modal.call-modal style="cursor: pointer" />
            </div>
            <div class="bd-highlight">
              <i-bi-pencil-square @click="composeOpen = true" aria-hidden="true" class="m-2" title="Compose" style="cursor: pointer" />
            </div>
          </div>
        </div>
        <profile-dropdown />
      </div>
    </div>
    <conversation-list />
    <settings-panel></settings-panel>
    <contact-list></contact-list>
    <compose-message-modal v-model="composeOpen" @sent="emit('messageSent')" />
  </div>
</template>

<script setup lang="ts">
/** The sidebar column: header icon row (settings, contacts, call, compose), the profile dropdown, the inbox list, and
 * the settings/contacts offcanvas panels the icons toggle. */
import { onMounted, ref } from 'vue'
import ComposeMessageModal from '@/components/chat/ComposeMessageModal.vue'
import ContactList from '@/components/contacts/ContactList.vue'
import SettingsPanel from '@/components/setting/SettingsPanel.vue'
import { useContactStore } from '@/stores/contact.ts'
import ConversationList from './ConversationList.vue'
import ProfileDropdown from './ProfileDropdown.vue'

defineOptions({ name: 'InboxSidebar' })

const emit = defineEmits<{ messageSent: [] }>()
const contactStore = useContactStore()
const composeOpen = ref(false)

onMounted(() => {
  void contactStore.loadContacts()
})
</script>
