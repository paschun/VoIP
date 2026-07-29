<template>
  <div class="w-100">
    <div class="sidebar-header">
      <div class="flex-grow-1">
        <ThemeButton size="50px" />
      </div>
      <!-- v-b-toggle ids target the offcanvas panels mounted at the bottom of this template -->
      <IBiGearFill v-b-toggle.sidebar-settings aria-hidden="true" class="icon" title="Settings" />
      <IBiPersonLinesFill v-b-toggle.sidebar-contacts aria-hidden="true" class="icon" title="Contacts" />
      <IBiTelephone v-b-modal.call-modal aria-hidden="true" class="icon" title="Call" />
      <IBiPencilSquare aria-hidden="true" class="icon" title="Compose" @click="composeOpen = true" />
      <ProfileDropdown />
    </div>
    <ConversationList />
    <SettingsPanel />
    <ContactList />
    <ComposeMessageModal v-model="composeOpen" />
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

const contactStore = useContactStore()
const composeOpen = ref(false)

onMounted(() => {
  void contactStore.loadContacts()
})
</script>

<style scoped>
.sidebar-header {
  width: 100%;
  height: 60px;
  background: var(--background-color-secondary);
  border-right: 1px solid #444444;
  display: flex;
  align-items: center;
  justify-content: end;
  padding-left: 10px;
}

.icon {
  margin: .5rem;
  cursor: pointer;
  flex-shrink: 0;
}
</style>
