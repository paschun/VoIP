import { ref, watch } from 'vue'
import { TelnyxRTC, type Call as TelnyxCall } from '@telnyx/webrtc'
import { Device as TwilioDevice, type Call as TwilioCall } from '@twilio/voice-sdk'
import type { InferResponseType } from 'hono/client'
import type { SuccessStatusCode } from 'hono/utils/http-status'
import { defineStore } from 'pinia'
import { e164Phone } from '@shared/contracts/phone.ts'
import { client, request } from '@/core/rpc.client.ts'
import { notifyError } from '@/notify.ts'
import { useContactStore } from '@/stores/contact.ts'
import { useProfileStore } from '@/stores/profile.ts'

/** Provider call token: a Twilio JWT, or (Telnyx) the Setting carrying SIP creds. Inferred from `POST /api/call/token`. */
type CallTokenData = InferResponseType<typeof client.api.call.token.$post, SuccessStatusCode>['data']

export type CallState = 'idle' | 'incoming' | 'active'

/** One dial-pad key. */
export type DialKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '*' | '#'

/**
 * The calling state machine. Owns the Twilio/Telnyx SDK lifecycle (token fetch, device build/teardown, profile-change
 * re-init) and the in-call state (`state`/`remoteNumber`/`remoteName`/`duration`); all provider branching lives here.
 * CallView calls `init()`/`destroy()` around its mount; the Telnyx client plays into CallView's `#remoteMedia` element.
 */
export const useCallStore = defineStore('call', () => {
  const profileStore = useProfileStore()
  const contactStore = useContactStore()

  const state = ref<CallState>('idle')
  const remoteNumber = ref('')
  const remoteName = ref('')
  /** Connected call time in seconds. */
  const duration = ref(0)

  // SDK handles stay out of refs so Vue's reactive proxy never wraps them.
  let twilioDevice: TwilioDevice | null = null
  let telnyxClient: TelnyxRTC | null = null
  let connection: TwilioCall | TelnyxCall | null = null
  let callType: 'twilio' | 'telnyx' | '' = ''
  let timerId = -1
  let initialized = false

  function startCallTimer() {
    duration.value = 0
    timerId = window.setInterval(() => {
      duration.value++
    }, 1000)
  }

  function stopCallTimer() {
    window.clearInterval(timerId)
    duration.value = 0
  }

  /** Back to idle: clears the call state; the SDK devices stay registered for the next call. */
  function resetCall() {
    stopCallTimer()
    state.value = 'idle'
    remoteName.value = ''
    remoteNumber.value = ''
    connection = null
  }

  async function lookupRemoteName() {
    if (!remoteNumber.value) return
    const match = await contactStore.lookupContact(remoteNumber.value)
    if (match) remoteName.value = match.first_name + ' ' + match.last_name
  }

  function bindCallEvents(call: TwilioCall) {
    call.on('accept', () => {
      connection = call
      state.value = 'active'
      startCallTimer()
      void lookupRemoteName()
    })
    call.on('disconnect', () => {
      resetCall()
    })
    call.on('cancel', () => {
      resetCall()
    })
    call.on('reject', () => {
      resetCall()
    })
    call.on('error', (error: Error) => {
      console.error('call error', error)
    })
  }

  function deviceSetup(tokenData: CallTokenData | undefined) {
    if (!tokenData) return
    if (tokenData.type === 'twilio') {
      callType = 'twilio'
      const device = new TwilioDevice(tokenData.token)
      device.on('registered', () => console.log('Connected'))
      device.on('error', (error: Error) => {
        console.error('twilio device error', error)
      })
      device.on('incoming', (call: TwilioCall) => {
        connection = call
        remoteNumber.value = call.parameters.From ?? ''
        state.value = 'incoming'
        bindCallEvents(call)
      })
      void device.register()
      twilioDevice = device
    } else if (tokenData.setting.sip_username && tokenData.setting.sip_password) {
      callType = 'telnyx'
      const rtc = new TelnyxRTC({
        login: tokenData.setting.sip_username,
        password: tokenData.setting.sip_password,
      })
      void rtc.connect()
      rtc.remoteElement = 'remoteMedia'
      rtc
        .on('telnyx.ready', () => console.log('telnyx rtc client, ready to call'))
        .on('telnyx.error', () => console.error('telnyx rtc client, error'))
        .on('telnyx.notification', (notification) => {
          const call = notification.call
          if (notification.type === 'callUpdate' && call) {
            connection = call
            switch (call.state) {
              case 'ringing':
                remoteNumber.value = call.options.remoteCallerNumber ?? ''
                state.value = 'incoming'
                break
              case 'active':
                state.value = 'active'
                startCallTimer()
                void lookupRemoteName()
                break
              case 'hangup':
              case 'destroy':
                resetCall()
                break
            }
          }
        })
      telnyxClient = rtc
    }
  }

  async function getToken(): Promise<CallTokenData | undefined> {
    const settingId = profileStore.activeProfileId
    if (!settingId) return
    const { data } = await request(client.api.call.token.$post({ json: { setting_id: settingId } }))
    return data
  }

  /** Release both SDK clients (safe with none active) and drop any in-flight call state. */
  function destroyDevices() {
    resetCall()
    try {
      twilioDevice?.destroy()
    } finally {
      twilioDevice = null
    }
    telnyxClient?.disconnect().catch((e) => console.error(e))
    telnyxClient = null
    callType = ''
  }

  /** Fetch a provider token and build the calling device. No-op while already initialized. */
  async function init() {
    if (initialized) return
    initialized = true
    deviceSetup(await getToken())
  }

  /** Tear everything down (CallView unmount). `init()` may be called again later. */
  function destroy() {
    initialized = false
    destroyDevices()
  }

  // Re-init the calling SDK when the selected profile changes. Gated on the id so a detail refresh (unread counts)
  // of the same profile doesn't needlessly tear down and rebuild the device.
  watch(
    () => profileStore.activeProfileId,
    async () => {
      // The store (and this watch) outlives CallView; after destroy() a profile change must not rebuild devices
      // while no call UI is mounted -- init() will when CallView next mounts.
      if (!initialized) return
      destroyDevices()
      deviceSetup(await getToken())
    },
  )

  /** Canonicalize to E.164 and place the call via the active provider SDK; false (with a toast) when invalid. */
  async function dial(raw: string): Promise<boolean> {
    const parsed = e164Phone.safeParse(raw)
    if (!parsed.success) {
      void notifyError('Please enter a valid phone number')
      return false
    }
    const n = parsed.data
    const callerNumber = profileStore.activeProfile?.number ?? ''
    if (callType === 'twilio') {
      const call = await twilioDevice?.connect({
        params: { number: n, twilio_number: callerNumber },
      })
      if (call) {
        connection = call
        bindCallEvents(call)
      }
    } else if (telnyxClient) {
      connection = telnyxClient.newCall({ destinationNumber: n, callerNumber })
    }
    if (!connection) return false
    remoteNumber.value = n
    state.value = 'active'
    return true
  }

  function accept() {
    if (connection) {
      if ('accept' in connection) connection.accept()
      else void connection.answer()
    }
    state.value = 'active'
  }

  function reject() {
    if (callType === 'twilio') {
      if (connection && 'reject' in connection) connection.reject()
      twilioDevice?.disconnectAll()
      resetCall()
    } else {
      hangup()
    }
  }

  function hangup() {
    if (callType === 'twilio') {
      twilioDevice?.disconnectAll()
    } else if (connection && 'hangup' in connection) {
      void connection.hangup()
    }
    resetCall()
  }

  /** DTMF on the active call. */
  function sendDigit(key: DialKey) {
    if (!connection) return
    if ('sendDigits' in connection) connection.sendDigits(key)
    else connection.dtmf(key)
  }

  return { state, remoteNumber, remoteName, duration, init, destroy, dial, accept, reject, hangup, sendDigit }
})
