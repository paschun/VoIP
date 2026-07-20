<template>
  <!-- Pure panel: opened by the sidebar's contacts icon via v-b-toggle.sidebar-right -->
  <div>
    <b-offcanvas id="sidebar-right" placement="end" shadow no-header>
      <template #default="{ hide }">
        <div class="d-flex flex-row mt-2 justify-content-between bd-highlight">
          <div class="bd-highlight dropDown">
            <b-button class="float-left d-flex m-1" size="sm" variant="primary">
              <i-bi-x @click="hide()" />
            </b-button>
          </div>
          <div>
            <div class="d-flex justify-content-start">
              <div class="ml-1">
                <b-button v-b-tooltip.hover title="Add Contact" class="float-left d-flex m-1" size="sm" variant="primary" @click="contactStore.startCreate()">
                  <i-bi-plus-circle />
                </b-button>
              </div>
              <div class="ml-2">
                <b-button v-b-tooltip.hover title="Export Contact" class="float-left d-flex m-1" size="sm" variant="primary" @click="exportContact()">
                  <i-bi-cloud-download />
                </b-button>
              </div>
              <div class="ml-2">
                <b-button v-b-tooltip.hover title="Delete All Contact" class="float-left d-flex m-1" size="sm" variant="danger" @click="deleteAll()">
                  <i-bi-trash-fill />
                </b-button>
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
              <div class="d-flex flex-row bd-highlight">
                <div class="bd-highlight">&nbsp;&nbsp;<i-bi-search />&nbsp;&nbsp;</div>
                <div class="bd-highlight">
                  <input v-model="query" type="text" class="input-search" placeholder="Search">
                </div>
              </div>
            </div>
          </div>
          <ul class="list-group">
            <li v-for="contact in searchContacts" :key="contact._id" class="list-group-item d-flex justify-content-between align-items-center">
              <div class="d-flex flex-column bd-highlight">
                <div class="bd-highlight">{{ contact.first_name }} {{ contact.last_name }}</div>
                <div class="bd-highlight">{{ contact.number }}</div>
              </div>
              <div>
                <i-bi-pencil-square title="Update" style="cursor: pointer" @click="contactStore.startEdit(contact)" />
                <i-bi-trash-fill title="Delete" style="cursor: pointer" @click="deleteContact(contact._id)" />
              </div>
            </li>
          </ul>
        </div>
      </template>
    </b-offcanvas>

    <ContactFormModal />
  </div>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import ContactFormModal from './ContactFormModal.vue'
import { downloadContactsCsv } from '@/core/services/contacts-csv.ts'
import { confirmDelete } from '@/helper.ts'
import { notifySuccess } from '@/core/notify.ts'
import { useContactStore } from '@/stores/contact.ts'

const contactStore = useContactStore()
const query = ref('')

/** Contact rows filtered by the search box. */
const searchContacts = computed(() => {
  const search = new RegExp(query.value, 'i')
  return contactStore.contacts.filter((item) => search.test(item.first_name) || search.test(item.last_name) || search.test(item.number))
})

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
