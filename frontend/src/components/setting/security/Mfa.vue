<template>
  <div class="m-2">
    <div class="">
      <div>
        <h6 class="border-bottom mx-1 pb-1">TOTP</h6>
        <div class="card m-1">
          <div class="card-body">
            <div class="row align-items-center">
              <div class="col-auto">
                <div>
                  <input id="checkbox" v-model="totpEnabled" type="checkbox" class="switch-checkbox" @change="totpStatusChange">
                  <label for="checkbox" class="switch-label switch-label-mode">
                    <span>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="#198754" width="23" height="23" viewBox="0 0 24 24">
                        <path
                          d="M12 2c5.514 0 10 4.486 10 10s-4.486 10-10 10-10-4.486-10-10 4.486-10 10-10zm0-2c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm4.393 7.5l-5.643 5.784-2.644-2.506-1.856 1.858 4.5 4.364 7.5-7.643-1.857-1.857z"
                        />
                      </svg>
                    </span>
                    <span>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="#fd3545" width="23" height="23" viewBox="0 0 24 24">
                        <path
                          d="M14 12h-4v-12h4v12zm4.213-10.246l-1.213 1.599c2.984 1.732 5 4.955 5 8.647 0 5.514-4.486 10-10 10s-10-4.486-10-10c0-3.692 2.016-6.915 5-8.647l-1.213-1.599c-3.465 2.103-5.787 5.897-5.787 10.246 0 6.627 5.373 12 12 12s12-5.373 12-12c0-4.349-2.322-8.143-5.787-10.246z"
                        />
                      </svg>
                    </span>
                    <div class="switch-toggle" :class="{ 'switch-toggle-checked': totpEnabled }"></div>
                  </label>
                </div>
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
    <hardware-key />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import Swal from 'sweetalert2'
import { client, request } from '@/core/rpc.client.ts'
import { notifyError } from '@/core/notify.ts'
import HardwareKey from './HardwareKey.vue'

defineOptions({ name: 'MfaSetting' })

const totpEnabled = ref(false)
const realTotp = ref(false) // reflects totp value on server
const qr = ref('')
const verificationCode = ref('')
const secret = ref('')
const secretCopied = ref(false)

async function getTotpStatus() {
  const enabled = (await request(client.api.auth.me.$get())).data.totp
  realTotp.value = enabled
  totpEnabled.value = enabled
}

async function totpStatusChange() {
  if (!totpEnabled.value) {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'Software token will be deleted. You will have to reconfigure it!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, remove it!',
    })
    if (!result.isConfirmed) {
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
  secretCopied.value = false
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

async function copySecret() {
  try {
    await navigator.clipboard.writeText(secret.value)
    secretCopied.value = true
  } catch (err) {
    console.error('Failed to copy!', err)
  }
}

onMounted(getTotpStatus)
</script>

<style scoped>
.switch-checkbox {
  display: none;
}

.switch-label {
  align-items: center;
  background: var(--background-color-secondary);
  border: calc(var(--element-size) * 0.025) solid var(--accent-color);
  border-radius: var(--element-size);
  cursor: pointer;
  display: flex;
  font-size: calc(var(--element-size) * 0.3);
  height: calc(var(--element-size) * 0.35);
  position: relative;
  padding: calc(var(--element-size) * 0.1);
  transition: background 0.5s ease;
  justify-content: space-between;
  width: var(--element-size);
  z-index: 1;
}

.switch-toggle {
  position: absolute;
  background-color: var(--contact-highlighted);
  border-radius: 50%;
  /* top: calc(var(--element-size) * 0.07); */
  left: calc(var(--element-size) * 0.07);
  height: calc(var(--element-size) * 0.45);
  width: calc(var(--element-size) * 0.45);
  transform: translateX(0);
  transition:
    transform 0.3s ease,
    background-color 0.5s ease;
}

.switch-toggle-checked {
  transform: translateX(calc(var(--element-size) * 0.6));
}
/* Compound selector so the fixed pill size beats `.switch-label`'s var-based width/height by specificity. */
.switch-label.switch-label-mode {
  height: 38px;
  width: 80px;
  float: left;
}
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
