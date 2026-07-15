<template>
  <div>
    <b-button id="incomingCallModel" v-b-modal.call-modal style="display: none">Launch demo modal</b-button>
    <b-modal ref="callModal" id="call-modal" no-footer>
      <template #header="{ close }">
        <!-- Emulate built in modal header close button action -->
        <b-button v-bind:class="{ 'd-none': connection }" size="sm" variant="outline-danger" @click="close()"> Close </b-button>
      </template>
      <template #default="{ hide }">
        <div class="d-flex justify-content-center">
          <div v-if="!incoming" style="max-width: 300px">
            <div v-if="!connection">
              <v-select class="mb-2" v-model="selectedContact" @option-selected="contactChangeEvent" :options="contactSelectOptions"></v-select>
              <b-form-group id="input-group-1" style="margin-bottom: 0">
                <b-form-input class="chat-input" v-model="phoneNumber" type="number" required style=""></b-form-input>
              </b-form-group>
            </div>
            <div v-else>
              <div class="dropdown float-right dropleft row m-0" style="width: 100%" id="call_number">
                <div class="dialer_bg multiCallData" id="data.call.sid" style="width: 100%">
                  <div class="row dialer_bg p-2">
                    <div class="d-flex justify-content-center" style="width: 100%">
                      <span class="multiCallData_name">{{ name }}</span>
                    </div>
                    <div class="d-flex justify-content-center" style="width: 100%">
                      <span class="multiCallData_name"> {{ phoneNumber }}</span>
                    </div>
                    <div class="d-flex justify-content-center" style="width: 100%">
                      <span class="timerContainer font-weight-bold mx-auto float-right mt-2" style="font-size: 45px; color: #4d64bc"
                        ><span class="multiCallData_minute" id="data.call.sid">{{ mm }}</span
                        >:<span class="multiCallData_second" id=" data.call.sid">{{ ss }}</span></span
                      >
                    </div>
                  </div>
                  <div class="p-1 mt-1">
                    <button
                      @click="disconnected()"
                      class="btn btn-danger multiCallData_hangup w-100"
                      data-id=' number + "'
                      data-sid='data.call.sid+"'
                      data-type='callType+"'
                      style="width: 100%; font-size: 30px"
                    >
                      Hangup
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <div class="d-flex justify-content-between mt-4">
                <div>
                  <a class="btn btn-light-primary dialer-btn2" @click="clickDialer(1)">
                    <p class="number font-weight-bolder mb-0">1</p>
                    <p class="alpha hide"></p>
                  </a>
                </div>
                <div>
                  <a class="btn btn-light-primary dialer-btn2" @click="clickDialer(2)">
                    <p class="number font-weight-bolder mb-0">2</p>
                    <p class="alpha">abc</p>
                  </a>
                </div>
                <div>
                  <a class="btn btn-light-primary dialer-btn2" @click="clickDialer(3)">
                    <p class="number font-weight-bolder">3</p>
                    <p class="alpha">def</p>
                  </a>
                </div>
              </div>

              <div class="d-flex justify-content-between">
                <div>
                  <a class="btn btn-light-primary dialer-btn2" @click="clickDialer(4)">
                    <p class="number font-weight-bolder">4</p>
                    <p class="alpha">ghi</p>
                  </a>
                </div>
                <div>
                  <a class="btn btn-light-primary dialer-btn2" @click="clickDialer(5)">
                    <p class="number font-weight-bolder">5</p>
                    <p class="alpha">jkl</p>
                  </a>
                </div>
                <div>
                  <a class="btn btn-light-primary dialer-btn2" @click="clickDialer(6)">
                    <p class="number font-weight-bolder">6</p>
                    <p class="alpha">mno</p>
                  </a>
                </div>
              </div>
              <div class="d-flex justify-content-between">
                <div>
                  <a class="btn btn-light-primary dialer-btn2" @click="clickDialer(7)">
                    <p class="number font-weight-bolder">7</p>
                    <p class="alpha">pqrs</p>
                  </a>
                </div>
                <div>
                  <a class="btn btn-light-primary dialer-btn2" @click="clickDialer(8)">
                    <p class="number font-weight-bolder">8</p>
                    <p class="alpha">tuv</p>
                  </a>
                </div>
                <div>
                  <a class="btn btn-light-primary dialer-btn2" @click="clickDialer(9)">
                    <p class="number font-weight-bolder">9</p>
                    <p class="alpha">wxyz</p>
                  </a>
                </div>
              </div>

              <div class="d-flex justify-content-between">
                <div>
                  <a class="btn btn-light-primary dialer-btn2">
                    <p class="number font-weight-bolder" @click="clickDialer('*')">*</p>
                  </a>
                </div>
                <div>
                  <a class="btn btn-light-primary dialer-btn2" @click="clickDialer(0)">
                    <p class="number font-weight-bolder">0</p>
                  </a>
                </div>
                <div>
                  <a class="btn btn-light-primary dialer-btn2" @click="clickDialer('#')">
                    <p class="number font-weight-bolder">#</p>
                  </a>
                </div>
              </div>
            </div>
            <div class="dialer-container single_header" v-if="!connection">
              <ul class="dialer-pad">
                <center class="mt-4">
                  <button type="button" v-b-tooltip.hover title="Call" class="btn btn-success m-1 px-5" @click="dial(phoneNumber)">
                    <i-bi-telephone-outbound aria-hidden="true" />
                  </button>
                  <button type="button" v-b-tooltip.hover title="Delete" class="btn btn-danger m-1 px-5" @click="removeNumber()">
                    <i-bi-backspace aria-hidden="true" />
                  </button>
                </center>
              </ul>
            </div>
          </div>
          <div v-else style="max-width: 300px">
            <center class="mt-3 pt-3">
              <div class="pt-4 pb-2">
                <button type="button" class="btn btn-success m-1">
                  <i-bi-person-fill aria-hidden="true" />
                </button>
                <p class="font-weight-bold mt-2" style="font-size: 30px; color: #787878; margin-bottom: 0">
                  {{ name }}
                </p>
                <p class="font-weight-bold" style="font-size: 30px; color: #787878">
                  {{ phoneNumber }}
                </p>
              </div>
              <h4 class="mb-4">Incoming call</h4>
              <button type="button" class="btn btn-success m-1" @click="acceptCall()">
                <i-bi-telephone-fill aria-hidden="true" />
              </button>
              <button type="button" class="btn btn-danger m-1" @click="rejectedCall()">
                <i-bi-x-circle aria-hidden="true" />
              </button>
            </center>
          </div>
        </div>
        <b-button style="display: none" @click="hide()">Hide Modal</b-button>
      </template>
    </b-modal>
    <audio id="remoteMedia" autoplay="true" />
  </div>
</template>

<script lang="ts">
import { defineComponent, useTemplateRef } from 'vue'
import { Select, type SelectOptionData } from 'vue3-select-component'
import { TelnyxRTC, type Call as TelnyxCall } from '@telnyx/webrtc'
import { Device as TwilioDevice, type Call as TwilioCall } from '@twilio/voice-sdk'
import type { BModal } from 'bootstrap-vue-next'
import type { InferResponseType } from 'hono/client'
import type { SuccessStatusCode } from 'hono/utils/http-status'
import { e164Phone } from '@shared/contracts/phone.ts'
import { client, request } from '@/core/rpc.client.ts'
import { contactsToOptions } from '@/helper.ts'
import { notifyError } from '@/notify.ts'
import { useContactStore } from '@/stores/contact.ts'
import { useProfileStore } from '@/stores/profile.ts'

/** Provider call token: a Twilio JWT, or (Telnyx) the Setting carrying SIP creds. Inferred from `POST /api/call/token`. */
type CallTokenData = InferResponseType<typeof client.api.call.token.$post, SuccessStatusCode>['data']

export default defineComponent({
  components: { 'v-select': Select },
  setup() {
    const callModal = useTemplateRef<InstanceType<typeof BModal>>('callModal')
    return { profileStore: useProfileStore(), contactStore: useContactStore(), callModal }
  },
  data(): {
    phoneNumber: string
    connection: TwilioCall | TelnyxCall | null
    name: string
    mm: string
    ss: string
    incoming: boolean
    callType: string
    twilioDevice: TwilioDevice | null
    telnyxRtcClient: TelnyxRTC | null
    userDurationIntervalId: number
    selectedContact: string
  } {
    return {
      phoneNumber: '',
      connection: null,
      name: '',
      mm: '00',
      ss: '00',
      incoming: false,
      callType: '',
      twilioDevice: null,
      telnyxRtcClient: null,
      userDurationIntervalId: -1,
      selectedContact: '',
    }
  },
  async mounted() {
    const tokenData = await this.getToken()
    this.deviceSetup(tokenData)
  },
  methods: {
    deviceSetup(tokenData: CallTokenData | undefined) {
      if (tokenData) {
        // `CallTokenData` is a union keyed on which payload arrived: Twilio sends a `token`, Telnyx sends the `setting`.
        if ('token' in tokenData) {
          this.callType = 'twilio'
          const device = new TwilioDevice(tokenData.token)
          device.on('registered', () => console.log('Connected'))
          device.on('error', (error: Error) => {
            console.error('twilio device error', error)
          })
          device.on('incoming', (call: TwilioCall) => {
            this.callModal?.show()
            this.connection = call
            this.phoneNumber = call.parameters.From ?? ''
            this.incoming = true
            this.bindCallEvents(call)
          })
          device.register()
          this.twilioDevice = device
        } else if ('setting' in tokenData && tokenData.setting.sip_username && tokenData.setting.sip_password) {
          this.callType = 'telnyx'
          const rtc = new TelnyxRTC({
            login: tokenData.setting.sip_username,
            password: tokenData.setting.sip_password,
          })
          rtc.connect()
          rtc.remoteElement = 'remoteMedia'
          rtc
            .on('telnyx.ready', () => console.log('ready to call'))
            .on('telnyx.error', () => console.error('error'))
            .on('telnyx.notification', (notification) => {
              const call = notification.call
              if (notification.type === 'callUpdate' && call) {
                this.connection = call
                switch (call.state) {
                  case 'ringing':
                    this.callModal?.show()
                    this.phoneNumber = call.options.remoteCallerNumber ?? ''
                    this.incoming = true
                    break
                  case 'active':
                    this.connection = call
                    this.startTimer()
                    this.getContact()
                    break
                  case 'hangup':
                    this.name = ''
                    this.connection = null
                    this.incoming = false
                    this.stopTimer()
                    break
                  case 'destroy':
                    this.name = ''
                    this.connection = null
                    this.incoming = false
                    break
                }
              }
            })
          this.telnyxRtcClient = rtc
        }
      }
    },
    async getToken(): Promise<CallTokenData | undefined> {
      const settingId = this.profileStore.activeProfileId
      if (!settingId) return
      const { data } = await request(client.api.call.token.$post({ json: { setting_id: settingId } }))
      return data
    },
    async getContact() {
      if (!this.phoneNumber) return
      const data = await this.contactStore.lookupContact(this.phoneNumber)
      if (data) {
        this.name = data.first_name + ' ' + data.last_name
      }
    },
    /** Tear down the active SDK client and re-init it against the current profile. Fires when the selection changes. */
    async reinitDevice() {
      this.destroyTwilioDevice()
      this.destroyTelnyxDevice()
      const tokenData = await this.getToken()
      this.deviceSetup(tokenData)
    },
    async makeCall(phoneNumber: string) {
      this.phoneNumber = phoneNumber
      if (await this.dial(phoneNumber)) this.callModal?.show()
    },
    /** Canonicalize to E.164 and place the call via the active provider SDK; false (with a toast) when invalid. */
    async dial(raw: string) {
      const parsed = e164Phone.safeParse(raw)
      if (!parsed.success) {
        void notifyError('Please enter a valid phone number')
        return false
      }
      const n = parsed.data
      const callerNumber = this.profileStore.activeProfile?.number ?? ''
      if (this.callType === 'twilio') {
        const call = await this.twilioDevice?.connect({
          params: { number: n, twilio_number: callerNumber },
        })
        if (call) {
          this.connection = call
          this.bindCallEvents(call)
        }
      } else if (this.telnyxRtcClient) {
        this.connection = this.telnyxRtcClient.newCall({
          destinationNumber: n,
          callerNumber,
        })
      }
      return true
    },
    bindCallEvents(call: TwilioCall) {
      call.on('accept', () => {
        this.connection = call
        this.startTimer()
        this.getContact()
      })
      call.on('disconnect', () => {
        console.log('Awaiting incoming call...')
        this.disconnected()
      })
      call.on('cancel', () => {
        this.disconnected()
      })
      call.on('reject', () => {
        this.disconnected()
      })
      call.on('error', (error: Error) => {
        console.error('call error', console.error(error))
      })
    },
    acceptCall() {
      if (this.connection) {
        if ('accept' in this.connection) this.connection.accept()
        else this.connection.answer()
      }
      this.incoming = false
    },
    rejectedCall() {
      if (this.callType === 'twilio') {
        if (this.connection && 'reject' in this.connection) this.connection.reject()
        this.twilioDevice?.disconnectAll()
      } else {
        this.disconnected()
      }
      this.connection = null
      this.incoming = false
    },
    startTimer() {
      let value = 0
      this.userDurationIntervalId = window.setInterval(() => {
        const m = Math.trunc(value / 60)
        const s = value % 60
        this.mm = String(m).padStart(2, '0')
        this.ss = String(s).padStart(2, '0')
        value++
      }, 1000)
    },
    stopTimer() {
      this.mm = '00'
      this.ss = '00'
      window.clearInterval(this.userDurationIntervalId)
    },
    disconnected() {
      this.stopTimer()
      if (this.callType === 'twilio') {
        this.twilioDevice?.disconnectAll()
      } else if (this.connection && 'hangup' in this.connection) {
        this.connection.hangup()
      }
      this.name = ''
      this.incoming = false
      this.connection = null
    },
    clickDialer(key: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | '*' | '#') {
      if (this.connection) {
        if ('sendDigits' in this.connection) this.connection.sendDigits(key.toString())
        else this.connection.dtmf(key.toString())
      } else {
        this.phoneNumber += key.toString()
      }
    },
    removeNumber() {
      if (this.phoneNumber) this.phoneNumber = this.phoneNumber.slice(0, -1)
    },
    contactChangeEvent(option: SelectOptionData<string>) {
      this.phoneNumber = option.value
      this.selectedContact = ''
    },
    destroyTwilioDevice() {
      try {
        this.twilioDevice?.destroy()
      } finally {
        this.twilioDevice = null
      }
    },
    destroyTelnyxDevice() {
      this.telnyxRtcClient?.disconnect().catch((e) => console.error(e))
    },
  },
  watch: {
    // Re-init the calling SDK when the selected profile changes. Gated on the id so a detail refresh (unread counts)
    // of the same profile doesn't needlessly tear down and rebuild the device. Replaces Dashboard's remount hack.
    'profileStore.activeProfileId'() {
      this.reinitDevice()
    },
  },
  computed: {
    contactSelectOptions(): SelectOptionData<string>[] {
      return contactsToOptions(this.contactStore.contacts)
    },
  },
  beforeUnmount() {
    const profileType = this.profileStore.activeProfileType
    if (profileType === 'telnyx') {
      this.destroyTelnyxDevice()
    }
    if (profileType === 'twilio') {
      this.destroyTwilioDevice()
    }
  },
})
</script>

<style scoped>
.number {
  margin-bottom: 0px;
  font-size: 40px;
  line-height: 30px;
}
.dialer-container {
  display: block;
  width: 100%;
  left: 0;
  right: 0;
  margin: 0 auto;
}

.dialer-pad {
  text-align: center;
  letter-spacing: -0.31em;
  display: inline-block;
  margin: 0;
  padding: 0;
  width: 100%;
}

.dialer-pad li {
  list-style: none;
  display: inline-block;
  width: 33.33%;
  letter-spacing: normal;
  padding: 22px 0 0px 0;
}

.dialer-pad li .number {
  margin-bottom: 0px;
  font-size: 40px;
  line-height: 30px;
}
.alpha {
  margin-bottom: auto;
}
.dialer-pad li .alpha {
  margin-bottom: 0;
  font-size: 15px;
}

.dialer-pad li .alpha.hide {
  visibility: hidden;
}

.dialer-pad li.action-btn {
  background: #fff;
  border: 1px solid #62a754;
  border-radius: 50%;
  margin: 40px 25px 0;
  width: 65px;
  padding: 0;
  height: 65px;
  vertical-align: middle;
  line-height: 65px;
}

.dialer-pad li.action-btn img {
  display: inline-block;
  width: auto;
  vertical-align: middle;
}

.dialer-pad li.action-btn p {
  display: inline-block;
  margin-bottom: 0;
  letter-spacing: normal;
  line-height: 50px;
}
</style>

<!-- Full-screen call modal; BModal's .modal-dialog is teleported, so this can't be scoped. -->
<style>
#call-modal .modal-dialog {
  max-width: 100%;
  margin: 0;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  height: 100vh;
  display: flex;
  position: fixed;
  z-index: 100000;
}
</style>
