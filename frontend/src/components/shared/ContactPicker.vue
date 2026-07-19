<template>
  <v-select v-model="selectedContact" :options="contactSelectOptions" @option-selected="onContactSelected"></v-select>
</template>

<script setup lang="ts">
/**
 * Contact dropdown over the contact store. Emits `select` with the picked contact's number as validated E.164 --
 * an invalid stored number toasts instead of emitting -- then clears itself so it acts as a picker, not a value.
 */
import { computed, ref } from 'vue'
import { Select as VSelect, type SelectOptionData } from 'vue3-select-component'
import { e164Phone } from '@shared/contracts/phone.ts'
import { notifyError } from '@/core/notify.ts'
import { useContactStore, type Contact } from '@/stores/contact.ts'

/** Map contacts to `v-select` options (label = full name, value = number). */
const contactsToOptions = (contacts: Contact[]): SelectOptionData<string>[] =>
  contacts.map((c) => ({ label: `${c.first_name} ${c.last_name}`, value: c.number }))

const emit = defineEmits<{ select: [number: string] }>()

const contactStore = useContactStore()
const selectedContact = ref('')
const contactSelectOptions = computed(() => contactsToOptions(contactStore.contacts))

function onContactSelected(option: SelectOptionData<string>) {
  const parsed = e164Phone.safeParse(option.value)
  if (!parsed.success) void notifyError('Contact has an invalid phone number')
  else emit('select', parsed.data)
  selectedContact.value = ''
}
</script>
