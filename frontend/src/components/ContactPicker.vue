<template>
  <v-select v-model="selectedContact" :options="contactSelectOptions" @option-selected="onContactSelected"></v-select>
</template>

<script lang="ts">
/**
 * Contact dropdown over the contact store. Emits `select` with the picked contact's number as validated E.164 --
 * an invalid stored number toasts instead of emitting -- then clears itself so it acts as a picker, not a value.
 */
import { defineComponent } from 'vue'
import { Select, type SelectOptionData } from 'vue3-select-component'
import { e164Phone } from '@shared/contracts/phone.ts'
import { contactsToOptions } from '@/helper.ts'
import { notifyError } from '@/notify.ts'
import { useContactStore } from '@/stores/contact.ts'

export default defineComponent({
  name: 'ContactPicker',
  components: { 'v-select': Select },
  emits: {
    select: (number: string) => typeof number === 'string', // runtime validation
  },
  setup() {
    return { contactStore: useContactStore() }
  },
  data(): { selectedContact: string } {
    return { selectedContact: '' }
  },
  computed: {
    contactSelectOptions(): SelectOptionData<string>[] {
      return contactsToOptions(this.contactStore.contacts)
    },
  },
  methods: {
    onContactSelected(option: SelectOptionData<string>) {
      const parsed = e164Phone.safeParse(option.value)
      if (!parsed.success) void notifyError('Contact has an invalid phone number')
      else this.$emit('select', parsed.data)
      this.selectedContact = ''
    },
  },
})
</script>
