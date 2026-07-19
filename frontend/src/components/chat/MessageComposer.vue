<template>
  <loading-spinner :show="isSendingMsg" />
  <div :class="!conversationStore.hasActiveConversation ? 'd-none' : ''">
    <div id="drop-area" style="z-index: 1" v-show="isDragging || uploadedImages.length" :class="{ highlight: isDragging }">
      <form class="upload-form">
        <p class="mt-0">Upload multiple files by dragging and dropping images inside this box</p>
        <div class="text-center m-auto">
          <button type="button" class="btn btn-danger px-4" @click="clearAttachments()">Cancel</button>
        </div>
        <input type="file" id="fileElem" class="d-none" multiple accept="image/*" @change="onFilesPick">
      </form>
      <div class="row" id="gallery">
        <div class="col-lg-4" v-for="image in uploadedImages" :key="image">
          <img style="width: 150px" :src="image">
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
      <div class="wrap-message" v-if="conversationStore.hasActiveConversation">
        <div class="message pl-2">
          <input type="text" class="input-message" placeholder="Type message here" v-model="messageBody" @keyup.enter="sendSms">
          <label class="m-2" for="fileElem" style="cursor: pointer">
            <i-bi-paperclip style="transform: scale(2)" />
          </label>
        </div>
        <div class="btn btn-primary m-2" @click="sendSms()" style="height: 36px">
          <i-bi-arrow-right-circle-fill aria-hidden="true" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Composer for the open conversation: text input, image attachments (file picker or drag-and-drop with previews and
 * upload progress), send. Emits `sent` after a successful send.
 */
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'
import { uploadMediaFiles } from '@/core/services/media.ts'
import { notifyError } from '@/core/notify.ts'
import { useConversationStore } from '@/stores/conversation.ts'
import { useUserStore } from '@/stores/user.ts'

const emit = defineEmits<{ sent: [] }>()

const conversationStore = useConversationStore()
const userStore = useUserStore()

const isSendingMsg = ref(false)
const isDragging = ref(false)
const isUploading = ref(false)
const uploadPercent = ref(0) // 0 to 100
const uploadedImages = ref<string[]>([])
const messageBody = ref('')

// Staged attachments belong to the conversation they were staged in.
watch(
  () => conversationStore.activeRemoteNumber,
  () => {
    uploadedImages.value = []
  },
)

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
  const target = e.target as HTMLInputElement
  // target.files will always be non-null, there is no way for to unselect files in a way that fires a change event.
  // even if in code, we set `target.value = null`, it will not fire a change event
  if (!target.files) return
  void uploadFiles(target.files)
}
async function uploadFiles(files: FileList) {
  uploadPercent.value = 0
  isUploading.value = true
  try {
    const urls = await uploadMediaFiles(files, userStore.token, (percent) => {
      uploadPercent.value = percent
    })
    uploadedImages.value.push(...urls)
  } finally {
    isUploading.value = false
  }
}
function removeFromPreview(image: string) {
  uploadedImages.value = uploadedImages.value.filter((img) => img !== image)
}
function clearAttachments() {
  uploadedImages.value = []
}
async function sendSms() {
  if (messageBody.value.trim() === '' && uploadedImages.value.length === 0) {
    notifyError('Message or file required', 'Oops...')
    return
  }
  if (!conversationStore.hasActiveConversation) return
  isSendingMsg.value = true
  try {
    await conversationStore.sendMessage({
      numbers: [conversationStore.activeRemoteNumber],
      message: messageBody.value,
      media: uploadedImages.value,
    })
    messageBody.value = ''
    uploadedImages.value = []
    emit('sent')
  } finally {
    isSendingMsg.value = false
  }
}

// Drag-and-drop listens on document so a drag anywhere over the app reaches the composer; preventDefault also
// stops the browser from navigating to a file dropped outside the drop zone.
onMounted(() => {
  document.addEventListener('dragenter', onDragOver)
  document.addEventListener('dragover', onDragOver)
  document.addEventListener('dragleave', onDragLeave)
  document.addEventListener('drop', onDrop)
})
onBeforeUnmount(() => {
  document.removeEventListener('dragenter', onDragOver)
  document.removeEventListener('dragover', onDragOver)
  document.removeEventListener('dragleave', onDragLeave)
  document.removeEventListener('drop', onDrop)
})
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
