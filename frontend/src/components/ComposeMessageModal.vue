<template>
  <b-modal ref="modal" size="lg" title="Compose Message" no-footer>
    <loading-spinner :show="isLoading" />
    <span class="small text-secondary"
      >Input (+) and country code followed by the 10 digit phone number. If no country code is provided (+1) is assumed. Multiple numbers will be sent as Bulk
      SMS (individual sms's to recipients). <span class="small text-center">[Telnyx does not support group texting]</span></span
    >
    <form @submit.prevent="sendComposedMessage" class="ml-2 mr-2">
      <v-select class="mt-4" v-model="selectedContact" @option-selected="contactChangeEvent" :options="contactSelectOptions"></v-select>
      <div class="form-group mt-4">
        <vue-tags-input
          class="form-control chat-input"
          v-model="tagInput"
          :tags="recipientTags"
          placeholder="Enter phone number"
          @tags-changed="onTagsChanged"
        />
        <div v-if="touched.recipients && !recipients.length" class="invalid-feedback d-block">
          <span>Please enter at least one number</span>
        </div>
      </div>
      <div class="form-group mb-2 mt-4">
        <textarea
          rows="8"
          class="form-control chat-input"
          v-model="composeMessage"
          placeholder="Type Message here"
          @blur="touched.message = true"
          :class="{ 'is-invalid': touched.message && composeContentMissing }"
        >
        </textarea>
        <div v-if="touched.message && composeContentMissing" class="invalid-feedback d-block">
          <span>Message or file required</span>
        </div>
      </div>
      <!-- send images over MMS -->
      <label class="input-group mb-3" for="model_file_input" style="cursor: pointer">
        <span class="input-group-text paperClip chat-input">
          <i-bi-paperclip />
        </span>
        <span class="form-control chat-input" :class="{ 'text-secondary': !selectedFileNames }">{{ selectedFileNames || 'Choose file' }}</span>
      </label>
      <div class="form-group mb-2 mt-4 d-none">
        <input type="file" id="model_file_input" class="form-control chat-input" multiple accept="image/*" @change="onFilesPick" />
      </div>

      <div class="d-grid d-md-flex">
        <button class="btn btn-primary submit-btn" type="submit" :disabled="!canSend">Send Message</button>
      </div>
    </form>
  </b-modal>
</template>

<script lang="ts">
/** Compose-SMS/MMS modal: pick recipients (contacts or free-typed numbers), attach images, send a bulk message. */
import { defineComponent, useTemplateRef } from 'vue'
import { Select, type SelectOptionData } from 'vue3-select-component'
import VueTagsInput from '@sipec/vue3-tags-input'
import type { BModal } from 'bootstrap-vue-next'
import { e164Phone } from '@shared/contracts/phone.ts'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { notifyError } from '@/notify.ts'
import { uploadMedia } from '@/core/services/media.ts'
import { contactsToOptions } from '@/helper.ts'
import { useContactStore } from '@/stores/contact.ts'
import { useConversationStore } from '@/stores/conversation.ts'
import { useUserStore } from '@/stores/user.ts'

/** A vue3-tags-input tag (the library is untyped). */
interface Tag {
  text: string
  tiClasses?: string[]
}

export default defineComponent({
  name: 'ComposeMessageModal',
  components: { VueTagsInput, LoadingSpinner, 'v-select': Select },
  emits: ['sent'],
  setup() {
    // regle is not used for the form
    const modal = useTemplateRef<InstanceType<typeof BModal>>('modal')
    return {
      modal,
      contactStore: useContactStore(),
      conversationStore: useConversationStore(),
      userStore: useUserStore(),
    }
  },
  data() {
    return {
      isLoading: false,
      selectedContact: '',
      recipients: [] as string[],
      tagInput: '',
      composeMessage: '',
      touched: { recipients: false, message: false }, // mimics regle
      uploadedImages: [] as string[],
      selectedFileNames: '',
    }
  },
  computed: {
    contactSelectOptions(): SelectOptionData<string>[] {
      return contactsToOptions(this.contactStore.contacts)
    },
    /** No text and no attached image -- a send needs at least one. */
    composeContentMissing(): boolean {
      return this.composeMessage.trim() === '' && !this.uploadedImages.length
    },
    /** All send preconditions met -- the manual analogue of Regle's r$.$correct; gates the submit button. */
    canSend(): boolean {
      return this.recipients.length > 0 && !this.composeContentMissing && !this.isLoading
    },
    /** vue-tags-input wants Tag objects; build them here so component state stays plain numbers. */
    recipientTags(): Tag[] {
      return this.recipients.map((text) => ({ text, tiClasses: ['ti-valid'] }))
    },
  },
  methods: {
    open() {
      this.modal?.show()
    },
    onTagsChanged(newTags: Tag[]) {
      this.touched.recipients = true
      // Canonicalize to E.164, drop invalid entries, dedupe -- so the same number typed two ways isn't sent twice.
      const parsed = newTags.map(({ text }) => e164Phone.safeParse(text))
      if (parsed.some((p) => !p.success)) void notifyError('Invalid phone number removed')
      this.recipients = [...new Set(parsed.filter((p) => p.success).map((p) => p.data))]
    },
    contactChangeEvent(option: SelectOptionData<string>) {
      this.touched.recipients = true
      const parsed = e164Phone.safeParse(option.value)
      if (!parsed.success) void notifyError('Contact has an invalid phone number')
      else if (!this.recipients.includes(parsed.data)) this.recipients.push(parsed.data)
      this.selectedContact = ''
    },
    async onFilesPick(e: Event) {
      const target = e.target as HTMLInputElement
      if (!target.files) return
      // keep the picked files readonly like the FileList they came from
      const files = Object.freeze([...target.files])
      this.selectedFileNames = files.map((f) => f.name).join()
      // map starts every upload at once (concurrent); each pushes as it resolves
      await Promise.all(
        files.map(async (f) => {
          const res = await uploadMedia(f, this.userStore.token)
          this.uploadedImages.push(res.data.media)
        }),
      )
    },
    async sendComposedMessage() {
      if (!this.recipients.length || this.composeContentMissing) return
      this.isLoading = true
      try {
        await this.conversationStore.sendMessage({
          numbers: this.recipients,
          message: this.composeMessage,
          media: this.uploadedImages,
        })
        this.reset()
        this.modal?.hide()
        this.$emit('sent')
      } finally {
        this.isLoading = false
      }
    },
    reset() {
      this.selectedContact = ''
      this.recipients = []
      this.tagInput = ''
      this.composeMessage = ''
      this.touched = { recipients: false, message: false }
      this.uploadedImages = []
      this.selectedFileNames = ''
    },
  },
})
</script>

<style scoped>
.paperClip {
  border-radius: 0% !important;
  border-top-left-radius: 5px !important;
  border-bottom-left-radius: 5px !important;
  padding: 0.5rem 0.75rem !important;
  border-right: 1px solid black;
}
</style>
