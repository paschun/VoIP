<template>
  <b-modal v-model="formVisible" title="Contact" no-footer @hidden="r$.$reset()">
    <div class="card mt-4">
      <div class="card-body">
        <b-tabs content-class="mt-3">
          <b-tab title="Add Contact" active>
            <form @submit.prevent="saveContact">
              <div class="form-group m-auto mb-2">
                <label>First Name</label>
                <input
                  class="form-control"
                  type="text"
                  placeholder="First Name"
                  v-model="r$.$value.first_name"
                  :class="{ 'is-invalid': r$.first_name.$error }"
                >
                <FieldErrors :field="r$.first_name" />
              </div>
              <div class="form-group m-auto mb-2">
                <label>Last Name</label>
                <input class="form-control" type="text" placeholder="Last Name" v-model="r$.$value.last_name">
              </div>
              <div class="form-group m-auto mb-2">
                <label>Number</label>
                <input class="form-control" type="text" placeholder="Number" v-model="r$.$value.number" :class="{ 'is-invalid': r$.number.$error }">
                <FieldErrors :field="r$.number" />
              </div>

              <div class="form-group m-auto mb-2">
                <label>Note</label>
                <input class="form-control" type="text" placeholder="Note" v-model="r$.$value.note">
              </div>
              <div class="d-flex justify-content-start bd-highlight">
                <div class="bd-highlight"><button type="submit" class="btn btn-primary float-right">Save</button></div>
              </div>
            </form>
          </b-tab>
          <b-tab title="Add Multiple">
            <div class="d-flex justify-content-end">
              <button class="btn btn-success mb-2 float-right" @click="downloadSampleCsv()">Sample File</button>
            </div>
            <label class="input-group mb-3" for="csv-file-input" style="cursor: pointer">
              <span class="input-group-text paperClip chat-input"><i-bi-paperclip /></span>
              <span class="form-control csv_field_input chat-input" :class="{ 'text-secondary': !csvFileName }">{{
                csvFileName || 'Choose file'
              }}</span>
            </label>
            <div class="form-group mb-2 mt-4 d-none">
              <input type="file" id="csv-file-input" class="form-control chat-input" accept=".csv" @change="onCsvFileChange">
            </div>
            <div class="d-flex justify-content-start bd-highlight">
              <div class="bd-highlight">
                <button type="button" :disabled="isParsingCsv" @click="importContactsCsv()" class="btn btn-primary float-right">Save</button>
              </div>
            </div>
          </b-tab>
        </b-tabs>
      </div>
    </div>
  </b-modal>
</template>

<script setup lang="ts">
/** The add/edit + CSV-import contact modal. Store-driven: opens via `contactStore.startCreate`/`startEdit`. */
import { computed, ref } from 'vue'
import { useRegle } from '@regle/core'
import { required, withMessage } from '@regle/rules'
import { storeToRefs } from 'pinia'
import { e164Phone } from '@shared/contracts/phone.ts'
import { downloadSampleCsv, parseCsvContacts } from '@/core/services/contacts-csv.ts'
import { notifyError } from '@/core/notify.ts'
import { useContactStore, type ContactDraft } from '@/stores/contact.ts'

const phonenumber = (value: unknown) => e164Phone.safeParse(value).success

/** What the form binds to while no draft is open (the modal is hidden then, so it never sees real input). */
const closedDraft: ContactDraft = { first_name: '', last_name: '', number: '', note: '' }

const contactStore = useContactStore()
const { draft } = storeToRefs(contactStore)
// Regle needs a non-null object to bind, so fall back to a throwaway blank while the draft is closed.
const formState = computed({
  get: () => draft.value ?? closedDraft,
  set: (value: ContactDraft) => {
    draft.value = value
  },
})
const { r$ } = useRegle(formState, {
  first_name: { required: withMessage(required, 'First Name is required') },
  number: { required: withMessage(required, 'Number is required'), phonenumber: withMessage(phonenumber, 'Please enter valid number. ') },
})

const csvFileName = ref('')
const isParsingCsv = ref(false)
const parsedCsvContacts = ref<ContactDraft[]>([])

const formVisible = computed({
  get: () => contactStore.drafting,
  set: (open: boolean) => {
    if (!open) contactStore.discardDraft()
  },
})

async function onCsvFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const fileToRead = target?.files?.[0]
  if (!fileToRead) return
  csvFileName.value = fileToRead.name
  // Clear before parsing so a mid-parse Import can't submit the previous file's rows.
  parsedCsvContacts.value = []
  isParsingCsv.value = true
  try {
    parsedCsvContacts.value = await parseCsvContacts(fileToRead)
  } finally {
    isParsingCsv.value = false
  }
}

async function saveContact() {
  const { valid, data } = await r$.$validate()
  if (!valid) return
  await contactStore.submitDraft(data)
}

async function importContactsCsv() {
  if (parsedCsvContacts.value.length === 0) {
    void notifyError('Please upload valid file!')
    return
  }
  await contactStore.importContacts(parsedCsvContacts.value)
  contactStore.discardDraft()
  csvFileName.value = ''
  parsedCsvContacts.value = []
}
</script>

<style scoped>
.close {
  margin: 0 !important;
}
.paperClip {
  border-radius: 0% !important;
  border-top-left-radius: 5px !important;
  border-bottom-left-radius: 5px !important;
  padding: 0.5rem 0.75rem !important;
  border-right: 1px solid lightgray;
  background: white !important;
}
.csv_field_input {
  background: white !important;
  color: black;
}
</style>
