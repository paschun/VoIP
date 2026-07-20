<template>
  <!-- ContactPicker only lives inside modals, which breaks two v1 defaults:
       - teleport=false: the default body-teleport lands the menu outside the modal, hidden behind it (z-index).
       - searchable=false: the searchable trigger's inner <input> opens the menu on focus; toggling it closed blurs
         focus to <body>, and the modal's focus trap immediately refocuses the input -> the menu reopens. A plain
         button trigger has no input to fight the trap over. -->
  <v-select
    v-model="selectedContact"
    :options="contactSelectOptions"
    :teleport="false"
    :searchable="false"
    placeholder="Select contacts"
    @option-selected="onContactSelected"
  ></v-select>
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
const selectedContact = ref<string | null>(null)
const contactSelectOptions = computed(() => contactsToOptions(contactStore.contacts))

function onContactSelected(option: SelectOptionData<string>) {
  const parsed = e164Phone.safeParse(option.value)
  if (!parsed.success) void notifyError('Contact has an invalid phone number')
  else emit('select', parsed.data)
  selectedContact.value = null // clear so it acts as a picker, not a bound value
}
</script>

<style scoped>
/* vue3-select-component (v1) exposes --vs-* vars. The vendor stylesheet sets defaults directly on both the trigger
   root and the menu, so override on both (a direct declaration beats an inherited one). :teleport="false" keeps the
   menu ([data-select-popover]) inside this component's DOM, so :deep() can reach it. */
[data-assembled-select],
:deep([data-select-popover]) {
  --vs-background-color: var(--background-color-secondary);
  --vs-text-color: var(--text-primary-color);
  --vs-placeholder-color: var(--accent-color);
  --vs-menu-background-color: var(--background-color-primary);
  --vs-option-hover-background-color: var(--contact-hover);
  --vs-option-focused-background-color: var(--contact-hover);
  --vs-option-selected-background-color: var(--contact-highlighted);
}
</style>
