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
                    <div >
                        <div class="d-flex justify-content-start">
                            <div class="ml-1">
                                <b-button v-b-tooltip.hover title="Add Contact" @click="openContactModel()" class="float-left d-flex m-1" size="sm" variant="primary">
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
                                <h4 class="pr-3 m-1">
                                    Contacts
                                </h4>
                            </div>
                        </div>
                    </div>
                </div>
                <div>
                  <div class="wrap-search">
                    <div class="search">
                      <div class="d-flex flex-row bd-highlight">
                        <div class="bd-highlight">
                          &nbsp;&nbsp;<i-bi-search />&nbsp;&nbsp;
                        </div>
                        <div class="bd-highlight">
                          <input type="text" class="input-search" v-model="query" @keyup="searchContact()" placeholder="Search" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <ul class="list-group">
                    <li v-for="contact in search_contacts" :key="contact._id" class="list-group-item d-flex justify-content-between align-items-center">
                      <div class="d-flex flex-column bd-highlight">
                        <div class="bd-highlight">
                          {{contact.first_name}} {{contact.last_name}}
                        </div>
                        <div class="bd-highlight">{{contact.number}}</div>
                      </div>
                      <div>
                        <i-bi-pencil-square title="Update" style="cursor: pointer;" @click="updateContact(contact)" />
                        <i-bi-trash-fill title="Delete" style="cursor: pointer;" @click="deleteContact(contact._id)" />
                      </div>
                    </li>
                  </ul>
                </div>
            </template>
        </b-offcanvas>

        <b-modal ref="contactModal" id="modal-contact" title="Contact" no-footer>
           <div class="card mt-4">
          <div class="card-body">
            <b-tabs content-class="mt-3">
              <b-tab title="Add Contact" active>
                <form @submit.prevent="handleSubmit">
                  <div class=" form-group m-auto mb-2">
                    <label>First Name</label>
                    <input class="form-control" type="text" placeholder="First Name" v-model="r$.$value.first_name" :class="{ 'is-invalid': r$.first_name.$error }"  />
                    <div v-if="r$.first_name.$error" class="invalid-feedback">
                      <span v-for="error of r$.$errors.first_name" :key="error">{{ error }}</span>
                    </div>
                  </div>
                  <div class="form-group m-auto mb-2">
                    <label>Last Name</label>
                    <input class="form-control" type="text" placeholder="Last Name" v-model="r$.$value.last_name"  />
                  </div>
                  <div class="form-group m-auto mb-2">
                    <label>Number</label>
                    <input class="form-control" type="text" placeholder="Number" v-model="r$.$value.number" :class="{ 'is-invalid': r$.number.$error }"  />
                    <div v-if="r$.number.$error" class="invalid-feedback">
                      <span v-for="error of r$.$errors.number" :key="error">{{ error }}</span>
                    </div>
                  </div>

                  <div class="form-group m-auto mb-2">
                    <label>Note</label>
                    <input class="form-control" type="text" placeholder="Note" v-model="r$.$value.note"  />
                  </div>
                  <div class="d-flex justify-content-start bd-highlight">
                    <div class="bd-highlight"><button type="submit" class="btn btn-primary float-right">Save</button></div>
                  </div>
                </form>
              </b-tab>
              <b-tab title="Add Multiple">
                <div class="d-flex justify-content-end">
                  <button class="btn btn-success mb-2 float-right" @click="downloadSampleCSV()">Sample File</button>
                </div>
                <label class="input-group mb-3" for="model_file_input2" style="cursor: pointer">
                  <span class="input-group-text paperClip chat-input"><i-bi-paperclip /></span>
                  <span class="form-control csv_field_input chat-input" :class="{ 'text-secondary': !modelFileValue }">{{ modelFileValue || 'Choose file' }}</span>
                </label>
                <div class="form-group mb-2 mt-4 d-none">
                  <input type="file" id="model_file_input2" class="form-control chat-input" accept=".csv" @change="onSelect">
                </div>
                <div class="d-flex justify-content-start bd-highlight">
                  <div class="bd-highlight"><button type="button" @click="handleSubmit2()" class="btn btn-primary float-right">Save</button></div>
                </div>
              </b-tab>
            </b-tabs>
          </div>
        </div>
        </b-modal>
    </div>
</template>
<script lang="ts">
import { defineComponent, ref, useTemplateRef, type PropType } from 'vue'
import { notifySuccess, notifyError, notifyInfo } from '@/notify.ts'
import type { Contact } from '@shared/api-contracts.ts'
import { useRegle } from '@regle/core'
import { required, regex, withMessage } from '@regle/rules'
import type { BModal } from 'bootstrap-vue-next'
import Papa from 'papaparse'
import { EventBus } from '@/event-bus.ts'

type TContact = Omit<Contact, '_id'>

const phonenumber = regex(/^\+?[-0-9() ]{5,17}$/)

function convertToCsv (rows: TContact[], headerList: (keyof TContact)[]): string {
  const header = headerList.join(',')
  const body = rows.map(
    (row) => 
      headerList.map((prop) => row[prop]).join(',')
    ).join('\r\n')
  return header + '\r\n' + body + '\r\n'
}

function downloadFile (rows: TContact[], filename = 'data') {
  const csvData = convertToCsv(rows, ['first_name', 'last_name', 'number', 'note'])
  const blob = new Blob(['\ufeff' + csvData], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const dwldLink = document.createElement('a')
  const isSafariBrowser = navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome')
  if (isSafariBrowser) dwldLink.setAttribute('target', '_blank')
  dwldLink.setAttribute('href', url)
  dwldLink.setAttribute('download', filename + '.csv')
  dwldLink.style.visibility = 'hidden'
  document.body.appendChild(dwldLink)
  dwldLink.click()
  document.body.removeChild(dwldLink)
}

const sampleContacts = [
  {
    'first_name': 'John',
    'last_name': 'Doe',
    'number': '12300XXXXX',
    'note': 'notes go here'
  }
] satisfies TContact[]

export default defineComponent({
  name: 'ContactList',
  setup () {
    const formState = ref({ first_name: '', last_name: '', number: '', note: '' })
    const { r$ } = useRegle(formState, {
      first_name: { required: withMessage(required, 'First Name is required') },
      number: { required: withMessage(required, 'Number is required'), phonenumber: withMessage(phonenumber, 'Please enter valid number. ') }
    })
    const contactModal = useTemplateRef<InstanceType<typeof BModal>>('contactModal')
    return { r$, formState, contactModal }
  },
  props: {
    contacts: { type: Array as PropType<Contact[]>, default: () => [] as Contact[] }
  },
  data () {
    return {
      modelFileValue: '',
      editId: '',
      search_contacts: [] as Contact[],
      query: '',
      csvUploadArray2: [] as TContact[]
    }
  },
  mounted () {
    EventBus.$on('addContact', (number: string) => {
      this.editId = ''
      this.emptyContact()
      this.contactModal?.show()
      this.formState.number = number
    })
  },
  methods: {
    exportContact () {
      downloadFile(this.contacts, 'contacts')
    },
    emptyContact () {
      this.formState = { first_name: '', last_name: '', number: '', note: '' }
    },

    async onSelect (event: Event) {
      const target = event.target as HTMLInputElement
      if (!target?.files) return
      const fileToRead = target.files[0]
      this.modelFileValue = fileToRead.name
      this.csvUploadArray2 = await this.readFile(fileToRead)
    },

    async readFile (file: File): Promise<TContact[]> {
      const fileText = await file.text()

      const { data: csvdata, errors } = Papa.parse<string[]>(fileText, { header: false })
      if (errors.length) {
        errors.forEach((err) => void notifyError(JSON.stringify(err), 'Error parsing CSV'))
        return []
      }

      // Skip the header row; keep rows with a non-empty first name.
      return csvdata.slice(1)
        .filter((row) => typeof row[0] === 'string' && row[0] !== '')
        .map((row) => ({ first_name: row[0], last_name: row[1], number: row[2], note: row[3] }))
    },
    downloadSampleCSV () {
      downloadFile(sampleContacts, 'sample_file')
    },
    openContactModel () {
      this.editId = ''
      this.emptyContact()
      this.contactModal?.show()
    },
    async handleSubmit () {
      const { valid, data } = await this.r$.$validate()
      if (!valid) return

      try {
        const response = this.editId
          ? await this.$put(`contact/${this.editId}`, data)
          : await this.$post('contact', data)
        if (response) {
          this.contactModal?.hide()
          this.$emit('onaddContact', true)
          EventBus.$emit('contactAdded', data.number)
          this.emptyContact()
        }
      } catch (e) {
        console.error(e)
      }
    },

    handleSubmit2 () {
      if (this.csvUploadArray2.length > 0) {
        this.$post('contact/bulk', { contacts: this.csvUploadArray2 })
          .then(() => {
            this.contactModal?.hide()
            this.$emit('onaddContact', true)
            this.modelFileValue = ''
          })
          .catch((e) => console.error(e))
      } else {
        void notifyError('Please upload valid file!')
      }
    },
    async deleteContact (id: string) {
      const result = await this.$swal.fire({
        icon: 'info',
        title: 'Do you want to delete this contact?',
        showDenyButton: true,
        showCancelButton: false,
        confirmButtonText: 'Yes, Delete',
        denyButtonText: 'No'
      })
      if (result.isDenied) { notifyInfo('contact not deleted'); return }
      if (!result.isConfirmed) return

      try {
        await this.$del(`contact/${id}`)
        notifySuccess('Contact Deleted successfully!')
        this.$emit('onaddContact', true)
        EventBus.$emit('contactAdded', 'delete')
      } catch (e) {
        console.error(e)
      }
    },
    updateContact (contact: Contact) {
      this.editId = contact._id
      this.formState = {
        first_name: contact.first_name,
        last_name: contact.last_name,
        number: contact.number,
        note: contact.note ?? ''
      }
      this.contactModal?.show()
    },
    async deleteAll () {
      const result = await this.$swal.fire({
        icon: 'info',
        title: 'Are you sure you want to delete ALL contacts?',
        showDenyButton: true,
        showCancelButton: false,
        confirmButtonText: 'Yes, Delete all',
        denyButtonText: 'No'
      })
      if (result.isDenied) { notifyInfo('contacts not deleted'); return }
      if (!result.isConfirmed) return

      try {
        await this.$del('contact')
        notifySuccess('All contacts deleted successfully')
        this.$emit('onaddContact', true)
      } catch (e) {
        console.error(e)
      }
    },
    searchContact () {
      const search = new RegExp(this.query, 'i')
      this.search_contacts = this.contacts.filter((item: Contact) =>
        search.test(item.first_name) ||
        search.test(item.last_name) ||
        search.test(item.number)
      )
    }
  },
  watch: {
    contacts() {
      this.searchContact()
    }
  }
})
</script>

<style scoped>
 .pointer-icon{
     cursor: pointer;
 }
 .close {
    margin: 0 !important;
}
.paperClip{
  border-radius: 0% !important;
  border-top-left-radius: 5px !important;
  border-bottom-left-radius: 5px !important;
  padding: 0.5rem 0.75rem !important;
  border-right: 1px solid lightgray;
  background: white !important;
}
.csv_field_input{
  background: white !important;
  color: black;
}
</style>
