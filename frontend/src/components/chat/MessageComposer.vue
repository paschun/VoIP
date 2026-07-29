<template>
  <LoadingSpinner :show="isSendingMsg" />
  <div :class="!conversationStore.hasActiveConversation ? 'd-none' : ''">
    <div v-show="isDragging || uploadedImages.length" id="drop-area" class="z-1" :class="{ highlight: isDragging }">
      <form class="upload-form">
        <p class="mt-0">Upload multiple files by dragging and dropping images inside this box</p>
        <div class="text-center m-auto">
          <button type="button" class="btn btn-danger px-4" @click="clearAttachments()">Cancel</button>
        </div>
        <input id="composer-file-input" type="file" class="d-none" multiple accept="image/*" @change="onFilesPick">
      </form>
      <div id="gallery" class="row">
        <div v-for="image in uploadedImages" :key="image" class="col-lg-4">
          <img class="preview-img" :src="image">
          <button type="button" class="btn p-0 border-0" @click="removeFromPreview(image)">
            <span class="start-100 translate-middle badge border border-light rounded-circle bg-danger">X</span>
          </button>
        </div>
      </div>
      <progress v-show="isUploading" class="w-100" max="100" :value="uploadPercent"></progress>
    </div>
  </div>
  <div class="row wrap-container">
    <div class="col-md-12 wrap-container2">
      <div v-if="conversationStore.hasActiveConversation" class="wrap-message">
        <div class="message pl-2">
          <input v-model="messageBody" type="text" class="input-message" placeholder="Type message here" @keyup.enter="sendSms">
          <label class="m-2 cursor-pointer" for="composer-file-input">
            <IBiPaperclip class="paperclip" />
          </label>
        </div>
        <div class="btn btn-primary m-2 send-btn" @click="sendSms()">
          <IBiArrowRightCircleFill aria-hidden="true" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Composer for the open conversation: text input, image attachments (file picker or drag-and-drop with previews and
 * upload progress), send.
 */
import { ref, watch } from 'vue'
import { useEventListener } from '@vueuse/core'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'
import { useBusy } from '@/composables/useBusy.ts'
import { useMediaUpload } from '@/composables/useMediaUpload.ts'
import { notifyError } from '@/core/notify.ts'
import { useConversationStore } from '@/stores/conversation.ts'

const conversationStore = useConversationStore()

const { busy: isSendingMsg, run: runSend } = useBusy()
const isDragging = ref(false)
const { uploadedImages, isUploading, uploadPercent, uploadFiles, clearAttachments } = useMediaUpload()
const messageBody = ref('')

// Staged attachments belong to the conversation they were staged in.
watch(() => conversationStore.activeRemoteNumber, clearAttachments)

function onDragOver(e: DragEvent) {
  e.preventDefault()
  if (conversationStore.hasActiveConversation) isDragging.value = true
}
function onDragLeave(e: DragEvent) {
  e.preventDefault()
  isDragging.value = false
}
function onDrop(e: DragEvent) {
  e.preventDefault()
  isDragging.value = false
  if (!conversationStore.hasActiveConversation) return
  const files = e.dataTransfer?.files
  if (files?.length) void uploadFiles(files)
}
function onFilesPick(e: Event) {
  // v-model can't bind a file input (its value is read-only), so a change listener is required
  const { target } = e
  // target.files will always be non-null, there is no way for to unselect files in a way that fires a change event.
  // even if in code, we set `target.value = null`, it will not fire a change event
  if (!(target instanceof HTMLInputElement) || !target.files) return
  void uploadFiles(target.files)
}
function removeFromPreview(image: string) {
  uploadedImages.value = uploadedImages.value.filter((img) => img !== image)
}
async function sendSms() {
  if (messageBody.value.trim() === '' && uploadedImages.value.length === 0) {
    void notifyError('Message or file required', 'Oops...')
    return
  }
  if (!conversationStore.hasActiveConversation) return
  await runSend(async () => {
    await conversationStore.sendMessage({
      numbers: [conversationStore.activeRemoteNumber],
      message: messageBody.value,
      media: uploadedImages.value,
    })
    messageBody.value = ''
    clearAttachments()
  })
}

// Drag-and-drop listens on document so a drag anywhere over the app reaches the composer; preventDefault also
// stops the browser from navigating to a file dropped outside the drop zone.
useEventListener(document, 'dragenter', onDragOver) // calls removeEventListener automatically on unmount
useEventListener(document, 'dragover', onDragOver)
useEventListener(document, 'dragleave', onDragLeave)
useEventListener(document, 'drop', onDrop)
</script>

<style scoped>
#drop-area {
  border: 2px dashed #ccc;
  border-radius: 20px;
  height: 75vh;
  font-family: sans-serif;
  padding: 20px;
  position: absolute;
  top: 100px;
  background: black;
}
#drop-area.highlight {
  border-color: purple;
}
.upload-form {
  margin-bottom: 10px;
}
#gallery {
  margin-top: 10px;
}

.preview-img {
  width: 150px;
}
.paperclip {
  transform: scale(2);
}
.send-btn {
  height: 36px;
}
.wrap-message {
  width: auto;
  height: 60px;
  background: var(--chat-background);
  display: flex;
}
.input-message {
  width: 100%;
  margin: 0 10px;
  border: none;
  background: var(--chat-you);
  color: var(--text-primary-color) !important;
  padding: 5px;
  border-radius: 25px;
  padding-left: 15px;
}
.input-message:focus {
  outline: none;
}
</style>
