<template>
  <div>
    <div class="profile">
      <ThemeButton />
      <div class="d-flex flex-row bd-highlight align-items-center align-self-center">
        <div class="mt-2">
          <!-- v-b-toggle ids target the offcanvas panels mounted at the bottom of this template -->
          <div class="d-flex flex-row bd-highlight">
            <div class="bd-highlight">
              <IBiGearFill v-b-toggle.sidebar-email-setting aria-hidden="true" class="m-2 cursor-pointer" title="Settings" />
            </div>
            <div class="bd-highlight">
              <IBiPersonLinesFill v-b-toggle.sidebar-right aria-hidden="true" class="m-2 cursor-pointer" title="Contacts" />
            </div>
            <div class="bd-highlight">
              <IBiTelephone v-b-modal.call-modal aria-hidden="true" class="m-2 cursor-pointer" title="Call" />
            </div>
            <div class="bd-highlight">
              <IBiPencilSquare aria-hidden="true" class="m-2 cursor-pointer" title="Compose" @click="composeOpen = true" />
            </div>
          </div>
        </div>
        <ProfileDropdown />
      </div>
    </div>
    <ConversationList />
    <SettingsPanel></SettingsPanel>
    <ContactList></ContactList>
    <ComposeMessageModal v-model="composeOpen" @sent="emit('messageSent')" />
  </div>
</template>

<script setup lang="ts">
/** The sidebar column: header icon row (settings, contacts, call, compose), the profile dropdown, the inbox list, and
 * the settings/contacts offcanvas panels the icons toggle. */
import { onMounted, ref } from 'vue'
import ComposeMessageModal from '@/components/chat/ComposeMessageModal.vue'
import ContactList from '@/components/contacts/ContactList.vue'
import SettingsPanel from '@/components/setting/SettingsPanel.vue'
import ThemeButton from '@/components/shared/ThemeButton.vue'
import { useContactStore } from '@/stores/contact.ts'
import ConversationList from './ConversationList.vue'
import ProfileDropdown from './ProfileDropdown.vue'

const emit = defineEmits<{ messageSent: [] }>()
const contactStore = useContactStore()
const composeOpen = ref(false)

onMounted(() => {
  void contactStore.loadContacts()
})
</script>
