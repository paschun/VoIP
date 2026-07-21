<template>
  <!-- Pure panel: opened by the sidebar's contacts icon via v-b-toggle.sidebar-contacts -->
  <div>
    <BOffcanvas id="sidebar-contacts" placement="end" shadow no-header>
      <template #default="{ hide }">
        <div class="d-flex mt-2 justify-content-between">
          <div class="drop-down">
            <BButton class="float-left d-flex m-1" size="sm" variant="primary">
              <IBiX @click="hide()" />
            </BButton>
          </div>
          <div>
            <div class="d-flex justify-content-start">
              <div class="ml-1">
                <BButton v-b-tooltip.hover title="Add Contact" class="float-left d-flex m-1" size="sm" variant="primary" @click="contactStore.startCreate()">
                  <IBiPlusCircle />
                </BButton>
              </div>
              <div class="ml-2">
                <BButton v-b-tooltip.hover title="Export Contact" class="float-left d-flex m-1" size="sm" variant="primary" @click="exportContact()">
                  <IBiCloudDownload />
                </BButton>
              </div>
              <div class="ml-2">
                <BButton v-b-tooltip.hover title="Delete All Contact" class="float-left d-flex m-1" size="sm" variant="danger" @click="deleteAll()">
                  <IBiTrashFill />
                </BButton>
              </div>
              <div>
                <h4 class="pr-3 m-1">Contacts</h4>
              </div>
            </div>
          </div>
        </div>
        <div>
          <div class="wrap-search">
            <div class="search">
              <div class="d-flex flex-row">
                <div>&nbsp;&nbsp;<IBiSearch />&nbsp;&nbsp;</div>
                <div>
                  <input v-model="query" type="text" class="input-search" placeholder="Search">
                </div>
              </div>
            </div>
          </div>
          <ul class="list-group">
            <li v-for="contact in searchContacts" :key="contact._id" class="list-group-item d-flex justify-content-between align-items-center">
              <div class="d-flex flex-column">
                <div>{{ contact.first_name }} {{ contact.last_name }}</div>
                <div>{{ contact.number }}</div>
              </div>
              <div>
                <IBiPencilSquare title="Update" class="cursor-pointer" @click="contactStore.startEdit(contact)" />
                <IBiTrashFill title="Delete" class="cursor-pointer" @click="deleteContact(contact._id)" />
              </div>
            </li>
          </ul>
        </div>
      </template>
    </BOffcanvas>

    <ContactFormModal />
  </div>
</template>
<script setup lang="ts">
import ContactFormModal from './ContactFormModal.vue'
import { useSearchFilter } from '@/composables/useSearchFilter.ts'
import { downloadContactsCsv } from '@/core/services/contacts-csv.ts'
import { confirmDelete } from '@/helper.ts'
import { notifySuccess } from '@/core/notify.ts'
import { useContactStore } from '@/stores/contact.ts'

const contactStore = useContactStore()

/** Contact rows filtered by the search box. */
const { query, results: searchContacts } = useSearchFilter(
  () => contactStore.contacts,
  ({ first_name, last_name, number }) => [first_name, last_name, number],
)

function exportContact() {
  downloadContactsCsv(contactStore.contacts, 'contacts')
}
async function deleteContact(id: string) {
  if (!(await confirmDelete('Do you want to delete this contact?', 'contact not deleted'))) return
  await contactStore.deleteContact(id)
  void notifySuccess('Contact Deleted successfully!')
}
async function deleteAll() {
  if (!(await confirmDelete('Are you sure you want to delete ALL contacts?', 'contacts not deleted'))) return
  await contactStore.deleteAllContacts()
  void notifySuccess('All contacts deleted successfully')
}
</script>
