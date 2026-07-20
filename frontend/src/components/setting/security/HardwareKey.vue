<template>
  <div>
    <h6 class="border-bottom mx-1 pb-1">Hardware Key</h6>
    <div class="card m-1" v-for="key in keys" :key="key._id">
      <div class="card-body">
        <div class="d-flex justify-content-between">
          <div class="pr-1 mr-2">
            <i-bi-key /><span class="mr-2"> {{ key.title }} </span>
          </div>
          <div class="pl-1 ml-2">
            <a href="javascript:void(0);" class="text-danger" @click="deleteKey(key._id)">
              <i-bi-trash />
            </a>
          </div>
        </div>
      </div>
    </div>
    <div class="card m-1">
      <div class="card-body">
        <div class="row align-items-center">
          <div class="col-auto">
            <div class="col-auto">
              <div class="d-flex justify-content-between">
                <div class="p-2">
                  <input type="text" class="form-control" v-model="title">
                </div>
                <div class="p-2">
                  <button class="btn btn-success" @click="register()">
                    <i-bi-plus />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import Swal from 'sweetalert2'
import { decode as cborDecode } from 'cbor-x/decode'
import type { InferResponseType } from 'hono/client'
import type { SuccessStatusCode } from 'hono/utils/http-status'
import { client, request } from '@/core/rpc.client.ts'
import { notifySuccess, notifyError } from '@/core/notify.ts'

type HardwareKeyList = InferResponseType<typeof client.api.hardwarekey.$get, SuccessStatusCode>['data']

// ---------------------------------------------------------------------------
// Local WebAuthn helpers (only used by this component)
// ---------------------------------------------------------------------------

const getEndian = (): 'little' | 'big' => {
  const buf = new ArrayBuffer(2)
  const u8 = new Uint8Array(buf)
  u8[0] = 0xaa
  u8[1] = 0xbb
  return new Uint16Array(buf)[0] === 0xbbaa ? 'little' : 'big'
}

const readBE16 = (buffer: Uint8Array): number => {
  if (buffer.length !== 2) throw new Error('Only 2byte buffer allowed!')
  if (getEndian() !== 'big') buffer = buffer.reverse()
  return new Uint16Array(buffer.buffer)[0]
}

const readBE32 = (buffer: Uint8Array): number => {
  if (buffer.length !== 4) throw new Error('Only 4byte buffers allowed!')
  if (getEndian() !== 'big') buffer = buffer.reverse()
  return new Uint32Array(buffer.buffer)[0]
}

const bufToHex = (buffer: Uint8Array): string => Array.prototype.map.call(new Uint8Array(buffer), (x: number) => x.toString(16).padStart(2, '0')).join('')

/** Parse a WebAuthn authData buffer. https://gist.github.com/herrjemand/dbeb2c2b76362052e5268224660b6fbc */
const parseAuthData = (buffer: Uint8Array) => {
  const rpIdHash = buffer.slice(0, 32)
  buffer = buffer.slice(32)
  const flagsBuf = buffer.slice(0, 1)
  buffer = buffer.slice(1)
  const flagsInt = flagsBuf[0]
  const flags = {
    up: !!(flagsInt & 0x01),
    uv: !!(flagsInt & 0x04),
    at: !!(flagsInt & 0x40),
    ed: !!(flagsInt & 0x80),
    flagsInt,
  }
  const counterBuf = buffer.slice(0, 4)
  buffer = buffer.slice(4)
  const counter = readBE32(counterBuf)

  let aaguid, credID, COSEPublicKey
  if (flags.at) {
    aaguid = buffer.slice(0, 16)
    buffer = buffer.slice(16)
    const lenBuf = buffer.slice(0, 2)
    buffer = buffer.slice(2)
    const credIDLen = readBE16(lenBuf)
    credID = buffer.slice(0, credIDLen)
    buffer = buffer.slice(credIDLen)
    COSEPublicKey = buffer
  }
  return { rpIdHash, flagsBuf, flags, counter, counterBuf, aaguid, credID, COSEPublicKey }
}

const title = ref('')
const keys = ref<HardwareKeyList>([])

async function getHardwareKey() {
  const res = await request(client.api.hardwarekey.$get())
  keys.value = res.data
}

async function deleteKey(id: string) {
  const result = await Swal.fire({
    title: 'Are you sure?',
    text: 'Hardware key will be deleted. You will have to set it up again!',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#3085d6',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Yes, remove it!',
  })
  if (!result.isConfirmed) return
  await request(client.api.hardwarekey[':id'].$delete({ param: { id } }))
  void notifySuccess('Your key has been deleted.', 'Deleted!')
  await getHardwareKey()
}

async function register() {
  if (title.value.trim() === '') {
    void notifyError('Please enter title')
    return
  }
  await request(client.api.hardwarekey.registration.begin.$post({ json: { title: title.value.trim() } }))

  const res = await request(client.api.hardwarekey.registration.challenge.$post({ json: {} }))
  const optionsJSON: PublicKeyCredentialCreationOptionsJSON = {
    ...res.data.publicKey,
    // Exclude already-registered authenticators so the same key can't enroll twice.
    excludeCredentials: res.data.hardwareKeys.flatMap((k) => (k.credentialId ? [{ id: k.credentialId, type: 'public-key' }] : [])),
  }
  const creationOptions = PublicKeyCredential.parseCreationOptionsFromJSON(optionsJSON)

  let credential: PublicKeyCredential | null
  try {
    credential = (await navigator.credentials.create({ publicKey: creationOptions })) as PublicKeyCredential | null
  } catch (error) {
    void notifyError(String(error), 'Key Error!')
    return
  }
  if (!credential) {
    void notifyError('No credential was created', 'Key Error!')
    return
  }

  // WebAuthn's attestationObject is an ArrayBuffer; cbor-x requires Uint8Array.
  const attestation = credential.response as AuthenticatorAttestationResponse
  const attestationObject = cborDecode(new Uint8Array(attestation.attestationObject))
  const authData = parseAuthData(attestationObject.authData)
  if (!authData.aaguid) {
    void notifyError('Could not read the authenticator AAGUID', 'Key Error!')
    return
  }
  const aaguid = bufToHex(authData.aaguid)
  // `credential.id` is already the base64url credential id the server stores.
  await request(client.api.hardwarekey.registration.verify.$post({ json: { id: credential.id, aaguid } }))
  void notifySuccess('Your key added successfully.', 'Key!')
  await getHardwareKey()
  title.value = ''
}

onMounted(getHardwareKey)
</script>
