<template>
  <div class="m-2">
    <div class="">
      <div>
        <h6 class="border-bottom mx-1 pb-1">TOTP</h6>
        <div class="card m-1">
          <div class="card-body">
            <div class="row align-items-center">
              <div class="col-auto">
                <ToggleSwitch v-model="totpEnabled" @change="totpStatusChange">
                  <template #on>
                    <svg xmlns="http://www.w3.org/2000/svg" width="23" height="23" fill="#198754" viewBox="0 0 24 24">
                      <path d="M12 2c5.514 0 10 4.486 10 10s-4.486 10-10 10S2 17.514 2 12 6.486 2 12 2m0-2C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0m4.393 7.5-5.643 5.784-2.644-2.506-1.856 1.858L10.75 17l7.5-7.643z" />
                    </svg>
                  </template>
                  <template #off>
                    <svg xmlns="http://www.w3.org/2000/svg" width="23" height="23" fill="#fd3545" viewBox="0 0 24 24">
                      <path d="M14 12h-4V0h4zm4.213-10.246L17 3.353c2.984 1.732 5 4.955 5 8.647 0 5.514-4.486 10-10 10S2 17.514 2 12c0-3.692 2.016-6.915 5-8.647L5.787 1.754C2.322 3.857 0 7.651 0 12c0 6.627 5.373 12 12 12s12-5.373 12-12c0-4.349-2.322-8.143-5.787-10.246" />
                    </svg>
                  </template>
                </ToggleSwitch>
              </div>
              <div class="col-auto">Status: <span v-if="realTotp">Active</span><span v-else>Inactive</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <hr>
    <div v-if="qr" class="text-center">
      <div class="text-center">Scan this QR code</div>
      <div class="text-center">
        <img class="mb-2 qr_image" :src="qr">
      </div>
      <div class="text-danger text-center">Or Enter Key Manually</div>
      <div class="card">
        <div class="card-body font-monospace clickcopy" @click="copySecret()">
          {{ secret }}
        </div>
      </div>
      <div class="text-secondary text-center">{{ secretCopied ? 'Copied!' : 'Click On Key To Copy' }}</div>
      <div class="form-group mt-1">
        <label>Enter Verification Code</label>
        <input
          v-model="verificationCode"
          type="form-control"
          maxlength="6"
          placeholder="000000"
          title="6 Digit Code"
          class="totp"
          @keyup.enter="verifyStatusCode()"
        >
      </div>
      <button type="button" class="btn btn-success m-2 px-4" @click="verifyStatusCode()">Verify</button>
    </div>
    <HardwareKey />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useClipboard } from '@vueuse/core'
import { client, request } from '@/core/rpc.client.ts'
import { confirmWarning } from '@/helper.ts'
import { notifyError } from '@/core/notify.ts'
import HardwareKey from './HardwareKey.vue'
import ToggleSwitch from '@/components/shared/ToggleSwitch.vue'

const totpEnabled = ref(false)
const realTotp = ref(false) // reflects totp value on server
const qr = ref('')
const verificationCode = ref('')
const secret = ref('')
// `secretCopied` flips the "Click On Key To Copy" hint to "Copied!" and auto-resets shortly after.
const { copy: copySecret, copied: secretCopied } = useClipboard({ source: secret })

async function getTotpStatus() {
  const enabled = (await request(client.api.auth.me.$get())).data.totp
  realTotp.value = enabled
  totpEnabled.value = enabled
}

async function totpStatusChange() {
  if (!totpEnabled.value) {
    if (!(await confirmWarning('Software token will be deleted. You will have to reconfigure it!'))) {
      totpEnabled.value = true
      return
    }
    qr.value = ''
    await request(client.api.auth.totp.$delete())
    await getTotpStatus()
    return
  }
  const res = await request(client.api.auth.totp.qr.$post())
  qr.value = res.data.image
  secret.value = res.data.secret
}

async function verifyStatusCode() {
  if (verificationCode.value === '') {
    void notifyError('Please enter verification code')
    return
  }
  // Pass the secret back: the server never persisted it at the QR step, so it stores it only once this code verifies.
  // If verification fails this will get a http 400 response and throw
  await request(client.api.auth.totp.$post({ json: { secret: secret.value, code: verificationCode.value } }))
  qr.value = ''
  verificationCode.value = ''
  secret.value = ''
  await getTotpStatus()
}

onMounted(getTotpStatus)
</script>

<style scoped>
.qr_image {
  width: auto;
  height: auto;
  margin: auto;
  border-radius: 0;
}
.clickcopy:hover {
  border-color: var(--accent-color);
  background: var(--contact-hover);
}
</style>
