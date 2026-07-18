<template>
  <loading-spinner :show="isSendingMsg" />
  <div :class="!conversationStore.hasActiveConversation ? 'd-none' : ''">
    <div id="drop-area" style="z-index: 1" v-show="isDragging || uploadedImages.length" :class="{ highlight: isDragging }">
      <form class="upload-form">
        <p class="mt-0">Upload multiple files by dragging and dropping images inside this box</p>
        <div class="text-center m-auto">
          <button type="button" class="btn btn-danger px-4" @click="clearAttachments()">Cancel</button>
        </div>
        <input type="file" id="fileElem" class="d-none" multiple accept="image/*" @change="onFilesPick" />
      </form>
      <div class="row" id="gallery">
        <div class="col-lg-4" v-for="image in uploadedImages" :key="image">
          <img style="width: 150px" :src="image" />
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
          <input type="text" class="input-message" placeholder="Type message here" v-model="messageBody" @keyup.enter="sendSms" />
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

<script lang="ts">
/**
 * Composer for the open conversation: text input, image attachments (file picker or drag-and-drop with previews and
 * upload progress), send. Emits `sent` after a successful send.
 */
import { defineComponent } from 'vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { uploadMediaFiles } from '@/core/services/media.ts'
import { notifyError } from '@/notify.ts'
import { useConversationStore } from '@/stores/conversation.ts'
import { useUserStore } from '@/stores/user.ts'

export default defineComponent({
  name: 'MessageComposer',
  components: { LoadingSpinner },
  emits: ['sent'],
  setup() {
    return { conversationStore: useConversationStore(), userStore: useUserStore() }
  },
  data(): {
    isSendingMsg: boolean
    isDragging: boolean
    isUploading: boolean
    uploadPercent: number // 0 to 100
    uploadedImages: string[]
    messageBody: string
  } {
    return {
      isSendingMsg: false,
      isDragging: false,
      isUploading: false,
      uploadPercent: 0,
      uploadedImages: [],
      messageBody: '',
    }
  },
  watch: {
    // Staged attachments belong to the conversation they were staged in.
    'conversationStore.activeRemoteNumber'() {
      this.uploadedImages = []
    },
  },
  // Drag-and-drop listens on document so a drag anywhere over the app reaches the composer; preventDefault also
  // stops the browser from navigating to a file dropped outside the drop zone.
  mounted() {
    document.addEventListener('dragenter', this.onDragOver)
    document.addEventListener('dragover', this.onDragOver)
    document.addEventListener('dragleave', this.onDragLeave)
    document.addEventListener('drop', this.onDrop)
  },
  beforeUnmount() {
    document.removeEventListener('dragenter', this.onDragOver)
    document.removeEventListener('dragover', this.onDragOver)
    document.removeEventListener('dragleave', this.onDragLeave)
    document.removeEventListener('drop', this.onDrop)
  },
  methods: {
    onDragOver(e: DragEvent) {
      e.preventDefault()
      if (this.conversationStore.hasActiveConversation) this.isDragging = true
    },
    onDragLeave(e: DragEvent) {
      e.preventDefault()
      this.isDragging = false
    },
    onDrop(e: DragEvent) {
      e.preventDefault()
      this.isDragging = false
      if (!this.conversationStore.hasActiveConversation) return
      const files = e.dataTransfer?.files
      if (files?.length) void this.uploadFiles(files)
    },
    onFilesPick(e: Event) {
      // v-model can't bind a file input (its value is read-only), so a change listener is required
      const target = e.target as HTMLInputElement
      // target.files will always be non-null, there is no way for to unselect files in a way that fires a change event.
      // even if in code, we set `target.value = null`, it will not fire a change event
      if (!target.files) return
      void this.uploadFiles(target.files)
    },
    async uploadFiles(files: FileList) {
      this.uploadPercent = 0
      this.isUploading = true
      try {
        const urls = await uploadMediaFiles(files, this.userStore.token, (percent) => {
          this.uploadPercent = percent
        })
        this.uploadedImages.push(...urls)
      } finally {
        this.isUploading = false
      }
    },
    removeFromPreview(image: string) {
      this.uploadedImages = this.uploadedImages.filter((img) => img !== image)
    },
    clearAttachments() {
      this.uploadedImages = []
    },
    async sendSms() {
      if (this.messageBody.trim() === '' && this.uploadedImages.length === 0) {
        notifyError('Message or file required', 'Oops...')
        return
      }
      if (!this.conversationStore.hasActiveConversation) return
      this.isSendingMsg = true
      try {
        await this.conversationStore.sendMessage({
          numbers: [this.conversationStore.activeRemoteNumber],
          message: this.messageBody,
          media: this.uploadedImages,
        })
        this.messageBody = ''
        this.uploadedImages = []
        this.$emit('sent')
      } finally {
        this.isSendingMsg = false
      }
    },
  },
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
  margin: 0px 10px;
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
