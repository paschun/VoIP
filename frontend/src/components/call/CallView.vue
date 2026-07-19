<template>
  <div>
    <b-modal ref="callModal" id="call-modal" no-footer>
      <template #header="{ close }">
        <!-- Emulate built in modal header close button action; hidden while a call is ringing or up. -->
        <b-button v-bind:class="{ 'd-none': callStore.state !== 'idle' }" size="sm" variant="outline-danger" @click="close()"> Close </b-button>
      </template>
      <template #default>
        <div class="d-flex justify-content-center">
          <incoming-call-panel v-if="callStore.state === 'incoming'" />
          <div v-else style="max-width: 300px">
            <div v-if="callStore.state === 'idle'">
              <contact-picker class="mb-2" @select="setDialInput" />
              <b-form-group style="margin-bottom: 0">
                <b-form-input class="chat-input" v-model="dialInput" type="number" required></b-form-input>
              </b-form-group>
            </div>
            <active-call-panel v-else />
            <dialer-pad @press="onKey" />
            <div class="dialer-container" v-if="callStore.state === 'idle'">
              <center class="mt-4">
                <button type="button" v-b-tooltip.hover title="Call" class="btn btn-success m-1 px-5" @click="callStore.dial(dialInput)">
                  <i-bi-telephone-outbound aria-hidden="true" />
                </button>
                <button type="button" v-b-tooltip.hover title="Delete" class="btn btn-danger m-1 px-5" @click="removeDigit()">
                  <i-bi-backspace aria-hidden="true" />
                </button>
              </center>
            </div>
          </div>
        </div>
      </template>
    </b-modal>
    <!-- used by the call store -->
    <audio id="remoteMedia" autoplay="true" />
  </div>
</template>

<script lang="ts">
/**
 * Full-screen call modal shell: the dialer (idle), IncomingCallPanel, or ActiveCallPanel, switched on the call
 * store's state. All SDK/provider logic lives in the store; the only local state is the number being typed.
 */
import { defineComponent, useTemplateRef } from 'vue'
import type { BModal } from 'bootstrap-vue-next'
import ContactPicker from '@/components/shared/ContactPicker.vue'
import ActiveCallPanel from './ActiveCallPanel.vue'
import DialerPad from './DialerPad.vue'
import IncomingCallPanel from './IncomingCallPanel.vue'
import { type CallState, type DialKey, useCallStore } from '@/stores/call.ts'

export default defineComponent({
  components: { ActiveCallPanel, ContactPicker, DialerPad, IncomingCallPanel },
  setup() {
    const callModal = useTemplateRef<InstanceType<typeof BModal>>('callModal')
    return { callStore: useCallStore(), callModal }
  },
  data(): { dialInput: string } {
    return { dialInput: '' }
  },
  mounted() {
    void this.callStore.init()
  },
  beforeUnmount() {
    this.callStore.destroy()
  },
  watch: {
    // Pops the modal for incoming calls and store-driven dials (Dashboard's chat-header call button).
    'callStore.state'(state: CallState) {
      if (state !== 'idle') this.callModal?.show()
    },
  },
  methods: {
    setDialInput(number: string) {
      this.dialInput = number
    },
    /** Keypad press: append while dialing, DTMF while on a call. */
    onKey(key: DialKey) {
      if (this.callStore.state === 'idle') this.dialInput += key
      else this.callStore.sendDigit(key)
    },
    removeDigit() {
      this.dialInput = this.dialInput.slice(0, -1)
    },
  },
})
</script>

<style scoped>
.dialer-container {
  display: block;
  width: 100%;
  left: 0;
  right: 0;
  margin: 0 auto;
  text-align: center;
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
