import { ref } from 'vue'
import { useBusy } from '@/composables/useBusy.ts'
import { uploadMediaFiles } from '@/core/services/media.ts'
import { useUserStore } from '@/stores/user.ts'

/** Staged image attachments and upload progress for a composer; each `uploadFiles` batch appends its URLs. */
export function useMediaUpload() {
  const userStore = useUserStore()
  const uploadedImages = ref<string[]>([])
  const { busy: isUploading, run } = useBusy()
  const uploadPercent = ref(0) // 0 to 100

  async function uploadFiles(files: FileList) {
    uploadPercent.value = 0
    await run(async () => {
      const urls = await uploadMediaFiles(files, userStore.token, (percent) => {
        uploadPercent.value = percent
      })
      uploadedImages.value.push(...urls)
    })
  }

  function clearAttachments() {
    uploadedImages.value = []
  }

  return { uploadedImages, isUploading, uploadPercent, uploadFiles, clearAttachments }
}
