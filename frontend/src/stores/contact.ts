import { computed, ref } from 'vue'
import type { InferRequestType, InferResponseType } from 'hono/client'
import type { SuccessStatusCode } from 'hono/utils/http-status'
import { defineStore } from 'pinia'
import { client, request } from '@/core/rpc.client.ts'
import { useConversationStore } from '@/stores/conversation.ts'

/** A saved contact, inferred from the contact-list route. */
export type Contact = InferResponseType<typeof client.api.contact.$get, SuccessStatusCode>['data'][number]
/** Create/update body (first_name + number required, names/note optional), inferred from the route. */
type ContactInput = InferRequestType<typeof client.api.contact.$post>['json']
/** One bulk-import row (lenient: only `number` required), inferred from the bulk route. */
type ContactBulkRow = InferRequestType<typeof client.api.contact.bulk.$post>['json']['contacts'][number]
/** The editable subset of a contact: the add/edit form draft and a CSV row. */
export type ContactDraft = Pick<Contact, 'first_name' | 'last_name' | 'number' | 'note'>

const emptyDraft = (): ContactDraft => ({ first_name: '', last_name: '', number: '', note: '' })

// Could do patch-in-place instead of re-fetch-all every time there is a mutation
//  - create ($post) and update ($put) return the saved ContactDoc: push it / replace the item by _id.
//  - delete: you know the id -> splice it out.
//  - delete-all: just clear the array.

// Could also model the store as a Map keyed by _id instead of an array, with getters for sorted/filtered views

/**
 * The user's address book + all contact data access. Holds the shared list (read by Sidebar/ContactList/Dashboard/
 * CallModal) and owns every read/write so no view talks to the contact routes directly. Mutations refresh the list AND
 * the conversation inbox (its rows denormalize the contact name), so callers never reload either by hand.
 */
export const useContactStore = defineStore('contact', () => {
  const contacts = ref<Contact[]>([])

  /** The in-progress add/edit; null when none. */
  const draft = ref<ContactDraft | null>(null)
  /** The contact `draft` is editing; '' while creating. */
  const editId = ref('')
  /** Whether a contact draft is in progress -- ContactFormModal shows itself while true. */
  const drafting = computed(() => draft.value !== null)

  /** Start drafting a new contact, number prefilled (chat-header "+", contact list). */
  function startCreate(number = ''): void {
    editId.value = ''
    draft.value = { ...emptyDraft(), number }
  }

  /** Start editing an existing contact. */
  function startEdit(contact: Contact): void {
    editId.value = contact._id
    const { first_name, last_name, number, note } = contact
    draft.value = { first_name, last_name, number, note }
  }

  /** Abandon the in-progress draft. */
  function discardDraft(): void {
    draft.value = null
    editId.value = ''
  }

  /** Refresh the full contact list. Returns it; throws (after the central toast) on failure. */
  async function loadContacts(): Promise<Contact[]> {
    const { data } = await request(client.api.contact.$get())
    contacts.value = data
    return data
  }

  /** Refresh the contact list and the inbox that embeds contact names.
   *  Function-scoped useConversationStore() keeps a hypothetical cross-store dependency safe. */
  async function afterMutation(): Promise<void> {
    const cs = useConversationStore()
    await loadContacts()
    await cs.loadConversations()
  }

  /** Persist the draft as `input` (its validated form): update when editing, create otherwise; refresh and close. */
  async function submitDraft(input: ContactInput): Promise<void> {
    if (editId.value) {
      await request(client.api.contact[':id'].$put({ param: { id: editId.value }, json: input }))
    } else {
      await request(client.api.contact.$post({ json: input }))
    }
    await afterMutation()
    discardDraft()
  }

  /** Bulk-create contacts from parsed CSV rows; then refresh. */
  async function importContacts(rows: ContactBulkRow[]): Promise<void> {
    await request(client.api.contact.bulk.$post({ json: { contacts: rows } }))
    await afterMutation()
  }

  /** Delete one contact; then refresh. */
  async function deleteContact(id: string): Promise<void> {
    await request(client.api.contact[':id'].$delete({ param: { id } }))
    await afterMutation()
  }

  /** Delete every contact; then refresh. */
  async function deleteAllContacts(): Promise<void> {
    await request(client.api.contact.$delete())
    await afterMutation()
  }

  /**
   * Resolve a phone number to its saved contact (caller-name lookup); null when unknown. Purely local: an exact
   * `number` match over the loaded list (numbers are stored E.164), fetching it first only if it's still empty.
   */
  async function lookupContact(number: string): Promise<Contact | null> {
    if (!contacts.value.length) await loadContacts()
    return contacts.value.find((c) => c.number === number) ?? null
  }

  return {
    contacts,
    draft,
    drafting,
    editId,
    startCreate,
    startEdit,
    discardDraft,
    submitDraft,
    loadContacts,
    importContacts,
    deleteContact,
    deleteAllContacts,
    lookupContact,
  }
})
