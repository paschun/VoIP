<template>
    <div>
        <h6 class="border-bottom mx-1 pb-1">Hardware Key</h6>
        <div class="card m-1"  v-for="key in keys" :key="key._id">
            <div class="card-body">
              <div class="d-flex justify-content-between">
                <div class="pr-1 mr-2">
                  <b-icon icon="key"></b-icon><span class="mr-2"> {{key.title}} </span>
                </div>
                <div class="pl-1 ml-2">
                  <a href="javascript:void(0);" class="text-danger" @click="deleteKey(key._id)">
                    <b-icon icon="trash"></b-icon>
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
                          <b-icon icon="plus"></b-icon>
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

<script>
import { post } from '../../../core/module/common.module'
import { publicKeyCredentialToJSON } from '../../../helper'
import { decode as cborDecode } from 'cbor-x/decode'

// ---------------------------------------------------------------------------
// Local WebAuthn helpers (only used by this component)
// ---------------------------------------------------------------------------

const getEndian = () => {
  const buf = new ArrayBuffer(2)
  const u8 = new Uint8Array(buf)
  u8[0] = 0xAA
  u8[1] = 0xBB
  return new Uint16Array(buf)[0] === 0xBBAA ? 'little' : 'big'
}

const readBE16 = (buffer) => {
  if (buffer.length !== 2) throw new Error('Only 2byte buffer allowed!')
  if (getEndian() !== 'big') buffer = buffer.reverse()
  return new Uint16Array(buffer.buffer)[0]
}

const readBE32 = (buffer) => {
  if (buffer.length !== 4) throw new Error('Only 4byte buffers allowed!')
  if (getEndian() !== 'big') buffer = buffer.reverse()
  return new Uint32Array(buffer.buffer)[0]
}

const bufToHex = (buffer) =>
  Array.prototype.map.call(new Uint8Array(buffer), x => x.toString(16).padStart(2, '0')).join('')

/** Parse a WebAuthn authData buffer. https://gist.github.com/herrjemand/dbeb2c2b76362052e5268224660b6fbc */
const parseAuthData = (buffer) => {
  const rpIdHash  = buffer.slice(0, 32);  buffer = buffer.slice(32)
  const flagsBuf  = buffer.slice(0, 1);   buffer = buffer.slice(1)
  const flagsInt  = flagsBuf[0]
  const flags = {
    up: !!(flagsInt & 0x01),
    uv: !!(flagsInt & 0x04),
    at: !!(flagsInt & 0x40),
    ed: !!(flagsInt & 0x80),
    flagsInt
  }
  const counterBuf = buffer.slice(0, 4);  buffer = buffer.slice(4)
  const counter = readBE32(counterBuf)

  let aaguid, credID, COSEPublicKey
  if (flags.at) {
    aaguid          = buffer.slice(0, 16);         buffer = buffer.slice(16)
    const lenBuf    = buffer.slice(0, 2);          buffer = buffer.slice(2)
    const credIDLen = readBE16(lenBuf)
    credID          = buffer.slice(0, credIDLen);  buffer = buffer.slice(credIDLen)
    COSEPublicKey   = buffer
  }
  return { rpIdHash, flagsBuf, flags, counter, counterBuf, aaguid, credID, COSEPublicKey }
}

/** Convert challenge + user.id from base64url strings to Uint8Arrays in-place. */
const preformatMakeCredReq = (req) => {
  req.challenge = Uint8Array.fromBase64(req.challenge, { alphabet: 'base64url' })
  req.user.id   = Uint8Array.fromBase64(req.user.id, { alphabet: 'base64url' })
  return req
}

export default {
  data () {
    return {
      title: '',
      keys: []
    }
  },
  mounted () {
    this.getHardwarekey()
  },
  methods: {
    deleteKey (id) {
      this.$swal.fire({
        title: 'Are you sure?',
        text: "Hardware key will be deleted. You will have to set it up again!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, remove it!'
      }).then((result) => {
        if (result.isConfirmed) {
          const request2 = {
            data: { id },
            url: 'hardwarekey/delete'
          }
          this.$store
            .dispatch(post, request2)
            .then((respose) => {
              if (respose) {
                this.$swal.fire(
                  'Deleted!',
                  'Your key has been deleted.',
                  'success'
                )
                this.getHardwarekey()
              }
            })
            .catch((e) => {

            })
        }
      })
    },
    getHardwarekey () {
      const request2 = {
        data: {},
        url: 'hardwarekey/get'
      }
      this.$store
        .dispatch(post, request2)
        .then((respose) => {
          if (respose) {
            this.keys = respose.data
          }
        })
        .catch((e) => {

        })
    },
    register () {
      if (this.title.trim() === '') {
        this.$swal.fire('Please enter title', '', 'error')
      } else {
        const request = {
          data: { title: this.title.trim() },
          url: 'hardwarekey/register-key'
        }
        this.$store
          .dispatch(post, request)
          .then((serverResponse) => {
            if (serverResponse) {
              if (serverResponse.status !== 'startFIDOEnrolment') {
                this.$swal.fire('Error registering user!', '', 'error')
              } else {
                const request2 = {
                  data: {},
                  url: 'hardwarekey/register'
                }
                this.$store
                  .dispatch(post, request2)
                  .then(async (respnse) => {
                    const hardwarekey = respnse.hardwarekey
                    let makeCredChallenge = respnse.publicKey
                    let newCredentialInfo
                    try {
                      console.log(makeCredChallenge)
                      makeCredChallenge = preformatMakeCredReq(makeCredChallenge)
                      const excludeCredentials = []
                      for (const key of hardwarekey) {
                        console.log(key)
                        excludeCredentials.push({
                          id: Uint8Array.fromBase64(key.credentials[0], { alphabet: 'base64url' }),
                          type: 'public-key'
                        })
                      }
                      makeCredChallenge.excludeCredentials = excludeCredentials
                      newCredentialInfo = await navigator.credentials.create({ 'publicKey': makeCredChallenge })
                      console.log(newCredentialInfo)
                    } catch (error) {
                      this.$swal.fire(
                        'Key!',
                        error.message,
                        'error'
                      )
                    }

                    // WebAuthn's attestationObject is an ArrayBuffer; cbor-x requires Uint8Array.
                    const attestationObject = cborDecode(new Uint8Array(newCredentialInfo.response.attestationObject))
                    const authData = parseAuthData(attestationObject.authData)
                    const aaguid = bufToHex(authData.aaguid)
                    newCredentialInfo = publicKeyCredentialToJSON(newCredentialInfo)
                    const request3 = {
                      data: { id: newCredentialInfo.id, aaguid: aaguid },
                      url: 'hardwarekey/verify'
                    }
                    this.$store
                      .dispatch(post, request3)
                      .then((serverResponse) => {
                        if (serverResponse.status !== 'ok') {
                          throw new Error('Error registering user! Server returned: ' + serverResponse.errorMessage)
                        } else {
                          this.$swal.fire(
                            'Key!',
                            'Your key added successfully.',
                            'success'
                          )
                          this.getHardwarekey()
                          this.title = ''
                        }
                      })
                      .catch((e) => {
                        console.error(e)
                      })
                  })
                  .catch((e) => {

                  })
              }
            }
          })
          .catch((e) => {

          })
      }
    },
  }
}
</script>
