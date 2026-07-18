import { ref } from 'vue'
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

// Could do patch-in-place instead of re-fetch-all every time there is a mutation
//  - create ($post) and update ($put) return the saved ContactDoc: push it / replace the item by _id.
//  - delete: you know the id -> splice it out.
//  - delete-all: just clear the array.

// Could also model the store as a Map keyed by _id instead of an array, with getters for sorted/filtered views

/**
 * The user's address book + all contact data access. Holds the shared list (read by NumberList/Contact/Dashboard/
 * CallView) and owns every read/write so no view talks to the contact routes directly. Mutations refresh the list AND
 * the conversation inbox (its rows denormalize the contact name), so callers never reload either by hand.
 */
export const useContactStore = defineStore('contact', () => {
  const contacts = ref<Contact[]>([])

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

  /** Create a contact, or update the one at `id` when given; then refresh. */
  async function saveContact(input: ContactInput, id?: string): Promise<void> {
    if (id) {
      await request(client.api.contact[':id'].$put({ param: { id }, json: input }))
    } else {
      await request(client.api.contact.$post({ json: input }))
    }
    await afterMutation()
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

  return { contacts, loadContacts, saveContact, importContacts, deleteContact, deleteAllContacts, lookupContact }
})
