<template>
  <BModal v-model="visible" size="lg" title="Compose Message" no-footer>
    <LoadingSpinner :show="isLoading" />
    <span class="small text-secondary"
      >Input (+) and country code followed by the 10 digit phone number. If no country code is provided (+1) is assumed. Multiple numbers will be sent as Bulk
      SMS (individual sms's to recipients). <span class="small text-center">[Telnyx does not support group texting]</span></span
    >
    <form class="ml-2 mr-2" @submit.prevent="sendComposedMessage">
      <ContactPicker class="mt-4" @select="addRecipient" />
      <div class="form-group mt-4">
        <VueTagsInput
          v-model="tagInput"
          class="form-control chat-input"
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
          v-model="composeMessage"
          rows="8"
          class="form-control chat-input"
          placeholder="Type Message here"
          :class="{ 'is-invalid': touched.message && composeContentMissing }"
          @blur="touched.message = true"
        >
        </textarea>
        <div v-if="touched.message && composeContentMissing" class="invalid-feedback d-block">
          <span>Message or file required</span>
        </div>
      </div>
      <!-- send images over MMS -->
      <label class="input-group mb-3 cursor-pointer" for="attachment-file-input">
        <span class="input-group-text paperClip chat-input">
          <IBiPaperclip />
        </span>
        <span class="form-control chat-input" :class="{ 'text-secondary': !selectedFileNames }">{{ selectedFileNames || 'Choose file' }}</span>
      </label>
      <div class="form-group mb-2 mt-4 d-none">
        <input id="attachment-file-input" type="file" class="form-control chat-input" multiple accept="image/*" @change="onFilesPick">
      </div>

      <div class="d-grid d-md-flex">
        <button class="btn btn-primary submit-btn" type="submit" :disabled="!canSend">Send Message</button>
      </div>
    </form>
  </BModal>
</template>

<script setup lang="ts">
/** Compose-SMS/MMS modal: pick recipients (contacts or free-typed numbers), attach images, send a bulk message. */
import { computed, ref } from 'vue'
import VueTagsInputModule from '@sipec/vue3-tags-input'
import { e164Phone } from '@shared/phone.ts'
import { useBusy } from '@/composables/useBusy.ts'
import { useMediaUpload } from '@/composables/useMediaUpload.ts'
import { useMobileSidebar } from '@/composables/useMobileSidebar.ts'
import { notifyError } from '@/core/notify.ts'
import { useConversationStore } from '@/stores/conversation.ts'
// UMD build exposes the component on `.default`; default-import interop can hand back the module namespace instead, so
// unwrap to the actual component (else Vue throws "missing template or render function").
const VueTagsInput = VueTagsInputModule.default ?? VueTagsInputModule

/** A vue3-tags-input tag (the library is untyped). */
interface Tag {
  text: string
  tiClasses?: string[]
}

const visible = defineModel<boolean>()

const conversationStore = useConversationStore()
// A send may have created the first thread for a number; drop the drawer to reveal it.
const { closeSidebar } = useMobileSidebar()

const { busy: isLoading, run } = useBusy()
const recipients = ref<string[]>([])
const tagInput = ref('')
const composeMessage = ref('')
const touched = ref({ recipients: false, message: false }) // mimics regle
const { uploadedImages, uploadFiles, clearAttachments } = useMediaUpload()
const selectedFileNames = ref('')

/** No text and no attached image -- a send needs at least one. */
const composeContentMissing = computed(() => composeMessage.value.trim() === '' && !uploadedImages.value.length)
/** All send preconditions met -- the manual analogue of Regle's r$.$correct; gates the submit button. */
const canSend = computed(() => recipients.value.length > 0 && !composeContentMissing.value && !isLoading.value)
/** vue-tags-input wants Tag objects; build them here so component state stays plain numbers. */
const recipientTags = computed<Tag[]>(() => recipients.value.map((text) => ({ text, tiClasses: ['ti-valid'] })))

function onTagsChanged(newTags: Tag[]) {
  touched.value.recipients = true
  // Canonicalize to E.164, drop invalid entries, dedupe -- so the same number typed two ways isn't sent twice.
  const parsed = newTags.map(({ text }) => e164Phone.safeParse(text))
  if (parsed.some((p) => !p.success)) void notifyError('Invalid phone number removed')
  recipients.value = [...new Set(parsed.filter((p) => p.success).map((p) => p.data))]
}

/** ContactPicker already validated the number as E.164; just dedupe against the tag list. */
function addRecipient(number: string) {
  touched.value.recipients = true
  if (!recipients.value.includes(number)) recipients.value.push(number)
}

async function onFilesPick(e: Event) {
  const { target } = e
  if (!(target instanceof HTMLInputElement) || !target.files) return
  selectedFileNames.value = [...target.files].map((f) => f.name).join()
  await uploadFiles(target.files)
}

async function sendComposedMessage() {
  if (!recipients.value.length || composeContentMissing.value) return
  await run(async () => {
    await conversationStore.sendMessage({
      numbers: recipients.value,
      message: composeMessage.value,
      media: uploadedImages.value,
    })
    reset()
    visible.value = false
    closeSidebar()
  })
}

function reset() {
  recipients.value = []
  tagInput.value = ''
  composeMessage.value = ''
  touched.value = { recipients: false, message: false }
  clearAttachments()
  selectedFileNames.value = ''
}
</script>

<style scoped>
/* vue3-tags-input injects its CSS at runtime (unlayered), so these overrides keep !important to win. The scope id
   lands on the child's root (`.vue-tags-input`); `:deep()` reaches its internal elements. */
.vue-tags-input,
:deep(.ti-input),
:deep(.ti-tags) {
  border: none !important;
  background-color: var(--background-color-secondary) !important;
  color: var(--text-primary-color) !important;
  border-radius: 10px !important;
  font-size: 14px !important;
  transition: 0.5s !important;
  display: inline-flex !important;
  max-width: 100% !important;
}
:deep(.ti-new-tag-input-wrapper input) {
  background-color: var(--background-color-secondary) !important;
  color: var(--text-primary-color) !important;
  min-width: 120px !important;
}
.paperClip {
  border-radius: 0% !important;
  border-top-left-radius: 5px !important;
  border-bottom-left-radius: 5px !important;
  padding: 0.5rem 0.75rem !important;
  border-right: 1px solid black;
}
</style>
