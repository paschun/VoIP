<template>
  <div>
    <i-bi-person-lines-fill class="pointer-icon m-2" aria-hidden="true" title="Contacts" v-b-toggle.sidebar-right />
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
                <b-button v-b-tooltip.hover title="Add Contact" @click="contactStore.startCreate()" class="float-left d-flex m-1" size="sm" variant="primary">
                  <i-bi-plus-circle />
                </b-button>
              </div>
              <div class="ml-2">
                <b-button v-b-tooltip.hover title="Export Contact" @click="exportContact()" class="float-left d-flex m-1" size="sm" variant="primary">
                  <i-bi-cloud-download />
                </b-button>
              </div>
              <div class="ml-2">
                <b-button v-b-tooltip.hover title="Delete All Contact" @click="deleteAll()" class="float-left d-flex m-1" size="sm" variant="danger">
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
                  <input type="text" class="input-search" v-model="query" placeholder="Search" />
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
<script lang="ts">
import { defineComponent } from 'vue'
import ContactFormModal from '@/components/ContactFormModal.vue'
import { downloadContactsCsv } from '@/core/services/contacts-csv.ts'
import { confirmDelete } from '@/helper.ts'
import { notifySuccess } from '@/core/notify.ts'
import { useContactStore, type Contact } from '@/stores/contact.ts'

export default defineComponent({
  components: { ContactFormModal },
  setup() {
    return { contactStore: useContactStore() }
  },
  data() {
    return { query: '' }
  },
  computed: {
    /** Contact rows filtered by the search box. */
    searchContacts(): Contact[] {
      const search = new RegExp(this.query, 'i')
      return this.contactStore.contacts.filter((item) => search.test(item.first_name) || search.test(item.last_name) || search.test(item.number))
    },
  },
  methods: {
    exportContact() {
      downloadContactsCsv(this.contactStore.contacts, 'contacts')
    },
    async deleteContact(id: string) {
      if (!(await confirmDelete('Do you want to delete this contact?', 'contact not deleted'))) return

      await this.contactStore.deleteContact(id)
      notifySuccess('Contact Deleted successfully!')
    },
    async deleteAll() {
      if (!(await confirmDelete('Are you sure you want to delete ALL contacts?', 'contacts not deleted'))) return

      await this.contactStore.deleteAllContacts()
      notifySuccess('All contacts deleted successfully')
    },
  },
})
</script>

<style scoped>
.pointer-icon {
  cursor: pointer;
}
</style>
