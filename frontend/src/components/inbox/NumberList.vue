<template>
  <div>
    <loading-spinner :show="isLoading" />
    <div class="profile">
      <div class="d-flex flex-row bd-highlight align-items-center align-self-center">
        <div class="mt-2">
          <div class="d-flex flex-row bd-highlight">
            <setting></setting>
            <div class="bd-highlight">
              <contact ref="contactComponent"></contact>
            </div>
            <div class="bd-highlight">
              <i-bi-telephone aria-hidden="true" class="m-2" title="Call" v-b-modal.call-modal style="cursor: pointer" />
            </div>
            <div class="bd-highlight">
              <i-bi-pencil-square @click="composeModal?.open()" aria-hidden="true" class="m-2" title="Compose" style="cursor: pointer" />
            </div>
          </div>
        </div>
        <div class="icons mt-2">
          <b-dropdown class="dropDown" variant="primary">
            <template #button-content>
              <div class="d-flex flex-row align-items-center bd-highlight">
                <div v-if="profileStore.activeProfile" class="d-flex flex-column bd-highlight">
                  <div class="profileName">{{ profileStore.activeProfile.profile }}</div>
                  <div class="profileNum">{{ profileStore.activeProfile.number }}</div>
                  <span
                    v-if="activeTotalCount > 0"
                    class="position-absolute top-0 start-100 translate-middle badge border border-light rounded-circle bg-danger p-2"
                    ><span class="visually-hidden">unread messages</span></span
                  >
                </div>
                <div v-else>
                  <span v-if="userStore.userData">{{ userStore.userData.name }}</span>
                </div>
                <div>
                  <i-bi-person-badge aria-hidden="true" class="mx-2 my-auto" title="Profiles" />
                </div>
                <div class="droupdownAdd"></div>
              </div>
            </template>
            <b-dropdown-divider></b-dropdown-divider>
            <profile-view ref="profileView" />
            <b-dropdown-item-button @click="logout()">
              <i-bi-power aria-hidden="true" />
              Logout
            </b-dropdown-item-button>
          </b-dropdown>
        </div>
      </div>
    </div>
    <div class="wrap-search">
      <div class="search">
        <i class="fa fa-search fa" aria-hidden="true"></i>
        <input type="text" class="input-search" v-model="query" placeholder="Search" />
      </div>
    </div>
    <div class="contact-list">
      <div class="box-placeholder" v-if="messageListLoader">
        <div class="p-4">
          <span class="category text link"></span>
          <h4 class="text line"></h4>
          <h4 class="text"></h4>
        </div>
        <hr />
        <div class="image">
          <div class="embed-responsive embed-responsive-16by9"></div>
        </div>
        <hr />
        <div class="excerpt p-4">
          <div class="text line"></div>
          <div class="text line"></div>
          <div class="text"></div>
        </div>
        <hr />
        <div class="excerpt p-4">
          <div class="text line"></div>
          <div class="text line"></div>
          <div class="text"></div>
        </div>
      </div>
      <template v-if="!messageListLoader">
        <div
          v-for="item in searchNumbers"
          :key="item._id"
          class="contact"
          :id="`phone${item._id}`"
          v-on:click="selectConversation(item)"
          v-bind:class="{ activeChat: conversationStore.activeRemoteNumber == item._id }"
        >
          <i-bi-person-bounding-box aria-hidden="true" class="mx-2 my-auto" style="font-size: 2em" />
          <div class="d-flex justify-content-between" style="width: 100%">
            <div class="contact-preview">
              <div class="contact-text">
                <h1 class="font-name" v-if="item.contact">{{ item.contact.first_name }} {{ item.contact.last_name }}</h1>
                <h1 v-else class="font-name">{{ item._id }}</h1>
                <p class="font-preview" v-if="item.message">
                  {{ getValidString(item.message) }}
                </p>
                <p class="font-preview" v-else>
                  <span v-if="item.message_type == 'call'">
                    <span v-if="item.type == 'send'"> Outbound </span>
                    <span v-else> Inbound </span>
                    Call
                  </span>
                </p>
              </div>
            </div>

            <div class="align-self-center text-end me-3">
              <span class="time">{{ formatTimestamp(item.created_at, false) }}</span>
              <!-- Jan 1, 2000 10:00 AM -->
              <span class="badge message_count bg-success" :id="item._id" v-if="item.unread > 0">{{ item.unread }}</span>
            </div>
          </div>
        </div>
      </template>
    </div>
    <compose-message-modal ref="composeModal" @sent="$emit('messageSent')" />
    <!-- todo: extract this modal into its own component? -->
    <b-modal ref="profileSettingModal" id="profile-setting-modal" size="lg" title="Settings" hide-footer>
      <theme-button id-hide="false" />
      <form @submit.prevent="saveProviderSetting" class="ml-2 mr-2">
        <b-form-radio-group
          id="provider-type-radios"
          v-model="r$.$value.type"
          :options="options"
          button-variant="outline-primary"
          size="lg"
          name="radio-btn-outline"
          buttons
        ></b-form-radio-group>
        <div class="card form-group mt-4">
          <div class="card-body">
            <div class="row m-auto">
              <div class="col-auto m-auto mb-1 mb-sm-auto">
                <label>
                  <i-bi-person-fill aria-hidden="true" />
                  Profile
                </label>
              </div>
              <div class="col-sm m-auto col-10">
                <input class="form-control" type="text" placeholder="Alias/Name" v-model="r$.$value.profile" :class="{ 'is-invalid': r$.profile.$error }" />
                <div v-if="r$.profile.$error" class="invalid-feedback">
                  <span v-for="error of r$.$errors.profile" :key="error">{{ error }}</span>
                </div>
              </div>
              <div class="col-1 m-auto">
                <span class="float-right" style="cursor: pointer" title="Delete">
                  <i-bi-trash @click="deleteProfile()" style="font-size: 1.5em" aria-hidden="true" />
                </span>
              </div>
            </div>
          </div>
        </div>
        <div class="card form-group mt-4 overflow-visible-card" v-if="r$.$value.type === 'telnyx'">
          <div class="card-body">
            <div class="row mb-2">
              <div class="col-auto m-auto">
                <label>
                  <i-bi-key aria-hidden="true" />
                  <b>Telnyx</b> API Key
                </label>
              </div>
              <div class="col-sm col-12 m-auto">
                <input class="form-control" type="text" placeholder="Telnyx API Key" v-model="r$.$value.api_key" :class="{ 'is-invalid': r$.api_key.$error }" />
                <div v-if="r$.api_key.$error" class="invalid-feedback">
                  <span v-for="error of r$.$errors.api_key" :key="error">{{ error }}</span>
                </div>
              </div>
            </div>
            <div class="row mb-2">
              <div class="col-auto m-auto">
                <button class="dark-mode btn btn-secondary btn-sm" type="button" id="get-number" @click="getNumbers('telnyx')">
                  <i-bi-telephone-plus aria-hidden="true" />
                  Get Number
                </button>
              </div>
              <div class="col col-lg-6 m-auto">
                <div class="form-group">
                  <custom-autocomplete-select
                    v-model="r$.$value.number"
                    :options="telnyxNumbers"
                    labelProp="phone_number"
                    valueProp="phone_number"
                  ></custom-autocomplete-select>
                  <div v-if="r$.number.$error" class="invalid-feedback">
                    <span v-for="error of r$.$errors.number" :key="error">{{ error }}</span>
                  </div>
                </div>
              </div>
              <div class="col-auto m-auto">
                <span class="float-right" style="cursor: pointer" @click="deleteApiKey()" title="Delete" v-if="showDelete">
                  <i-bi-trash style="font-size: 1.5em" aria-hidden="true" />
                </span>
              </div>
            </div>
          </div>
        </div>
        <div class="card form-group mt-4 overflow-visible-card" v-if="r$.$value.type === 'twilio'">
          <div class="card-body">
            <div class="row mb-2">
              <div class="col-auto col-lg-3 m-auto">
                <label>
                  <i-bi-key aria-hidden="true" />
                  <b>Twilio</b> SID
                </label>
              </div>
              <div class="col-12 col-sm col-lg-9 m-auto">
                <input
                  class="form-control"
                  type="text"
                  placeholder="Twilio SID"
                  v-model="r$.$value.twilio_sid"
                  :class="{ 'is-invalid': r$.twilio_sid.$error }"
                />
                <div v-if="r$.twilio_sid.$error" class="invalid-feedback">
                  <span v-for="error of r$.$errors.twilio_sid" :key="error">{{ error }}</span>
                </div>
              </div>
            </div>

            <div class="row mb-2">
              <div class="col-auto col-lg-3 m-auto">
                <label>
                  <i-bi-key aria-hidden="true" />
                  <b>Twilio</b> Token
                </label>
              </div>
              <div class="col-12 col-sm col-lg-9 m-auto">
                <input
                  class="form-control"
                  type="text"
                  placeholder="Twilio Token"
                  v-model="r$.$value.twilio_token"
                  :class="{ 'is-invalid': r$.twilio_token.$error }"
                />
                <div v-if="r$.twilio_token.$error" class="invalid-feedback">
                  <span v-for="error of r$.$errors.twilio_token" :key="error">{{ error }}</span>
                </div>
              </div>
            </div>
            <div class="row mb-2">
              <div class="col-auto m-auto">
                <button class="dark-mode btn btn-secondary btn-sm" type="button" id="get-number-twilio" @click="getNumbers('twilio')">
                  <i-bi-telephone-plus aria-hidden="true" />
                  Get Number
                </button>
              </div>
              <div class="col col-lg-6 m-auto">
                <div class="form-group">
                  <custom-autocomplete-select
                    v-model="r$.$value.twilio_number"
                    :options="twilioNumbers"
                    labelProp="phoneNumber"
                    valueProp="phoneNumber"
                  ></custom-autocomplete-select>
                  <div v-if="r$.twilio_number.$error" class="invalid-feedback">
                    <span v-for="error of r$.$errors.twilio_number" :key="error">{{ error }}</span>
                  </div>
                </div>
              </div>
              <div class="col-auto m-auto">
                <span class="float-right" style="cursor: pointer" @click="deleteApiKey()" title="Delete" v-if="showDelete">
                  <i-bi-trash style="font-size: 1.5em" aria-hidden="true" />
                </span>
              </div>
            </div>
          </div>
        </div>
        <div class="d-grid d-md-flex">
          <button class="btn btn-success mt-4 submit-btn" type="submit">Save</button>
        </div>
      </form>
    </b-modal>
  </div>
</template>

<script lang="ts">
/**
 * this component contains the telnyx/twilio modal when you click settings->profile settings
 *
 * TODO: this modal does two jobs and guesses intent from `profile === ""`. Split into two single-purpose flows:
 *   1. createProfile(name):     form = { profile: required }          -> POST profile; make it active
 *   2. configureProvider():     variant on `type`, provider fields required (active profile assumed, name
 *                               shown read-only)                       -> POST profile/provider
 * Then neither form needs requiredIf/`configuringProvider`; step 1 can reuse ProfileView's create flow.
 */
import { defineComponent, ref, useTemplateRef } from 'vue'
import { useRegle, createVariant } from '@regle/core'
import { required, requiredIf, literal, withMessage } from '@regle/rules'
import type { BModal } from 'bootstrap-vue-next'
import type { InferRequestType, InferResponseType } from 'hono/client'
import type { SuccessStatusCode } from 'hono/utils/http-status'
import PullToRefresh from 'pulltorefreshjs'
import ComposeMessageModal from '@/components/ComposeMessageModal.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import Contact from '@/components/setting/Contact.vue'
import ProfileView from '@/components/setting/ProfileView.vue'
import Setting from '@/components/setting/Setting.vue'
import ThemeButton from '@/components/ThemeButton.vue'
import { client, request } from '@/core/rpc.client.ts'
import { formatTimestamp } from '@/helper.ts'
import { notifySuccess, notifyInfo } from '@/notify.ts'
import { appDirectory } from '@/router/helpers.ts'
import { useContactStore } from '@/stores/contact.ts'
import { useConversationStore, type Conversation } from '@/stores/conversation.ts'
import { useProfileStore } from '@/stores/profile.ts'
import { useUserStore } from '@/stores/user.ts'
import CustomAutocompleteSelect from '../CustomAutocompleteSelect.vue'

function getValidString(str: string): string {
  return str.length > 10 ? str.substring(0, 10) + '..' : str
}

/** The full provider-config request body, inferred from the endpoint's tightened zod schema. */
type ProviderSettingPayload = InferRequestType<typeof client.api.profile.provider.$post>['json']
/** The subset edited in the settings modal (server-side identifiers are added at submit). `type` discriminates which provider's fields the variant rules require. */
type ProviderSettingForm = Omit<ProviderSettingPayload, 'setting' | 'sid' | 'override'>
/** The provider-numbers response payload, discriminated by `type`. */
type ProviderNumbers = InferResponseType<(typeof client.api.setting)['provider-numbers']['$post'], SuccessStatusCode>['data']
/** A purchasable Telnyx number from the provider-numbers lookup (`id` is the lookup's sid). */
type TelnyxNumber = Extract<ProviderNumbers, { type: 'telnyx' }>['numbers'][number]
/** A purchasable Twilio number from the provider-numbers lookup. */
type TwilioNumber = Extract<ProviderNumbers, { type: 'twilio' }>['numbers'][number]

export default defineComponent({
  emits: ['conversationSelected', 'messageSent'],
  components: {
    ProfileView,
    LoadingSpinner,
    ThemeButton,
    Contact,
    Setting,
    CustomAutocompleteSelect,
    ComposeMessageModal,
  },
  setup() {
    const form = ref<ProviderSettingForm>({
      type: 'telnyx',
      profile: '',
      api_key: '',
      number: '',
      twilio_sid: '',
      twilio_token: '',
      twilio_number: '',
    })
    // Provider fields are required only when no profile name is entered (i.e. configuring the active profile's provider).
    const requiredWhenConfiguring = (msg: string) =>
      withMessage(
        requiredIf(() => !form.value.profile),
        msg,
      )
    const { r$ } = useRegle(form, () => {
      const provider = createVariant(form, 'type', [
        {
          type: { literal: literal('telnyx') },
          api_key: { required: requiredWhenConfiguring('API Key is required') },
          number: { required: requiredWhenConfiguring('Number is required') },
        },
        {
          type: { literal: literal('twilio') },
          twilio_sid: { required: requiredWhenConfiguring('Twilio sid is required') },
          twilio_token: { required: requiredWhenConfiguring('Twilio token is required') },
          twilio_number: { required: requiredWhenConfiguring('Number is required') },
        },
      ])
      return {
        profile: { required: withMessage(required, 'Profile is required') },
        ...provider.value,
      }
    })
    const profileView = useTemplateRef<InstanceType<typeof ProfileView>>('profileView')
    const profileSettingModal = useTemplateRef<InstanceType<typeof BModal>>('profileSettingModal')
    const contactComponent = useTemplateRef<InstanceType<typeof Contact>>('contactComponent')
    const composeModal = useTemplateRef<InstanceType<typeof ComposeMessageModal>>('composeModal')
    return {
      r$,
      form,
      profileStore: useProfileStore(),
      userStore: useUserStore(),
      contactStore: useContactStore(),
      conversationStore: useConversationStore(),
      profileView,
      profileSettingModal,
      contactComponent,
      composeModal,
    }
  },
  data() {
    return {
      query: '',
      isLoading: false, // todo: fixme
      messageListLoader: true,
      telnyxNumbers: [] as TelnyxNumber[],
      twilioNumbers: [] as TwilioNumber[],
      options: [
        { text: 'Telnyx', value: 'telnyx' },
        { text: 'Twilio', value: 'twilio' },
      ],
      showDelete: false,
    }
  },
  computed: {
    // Inbox rows filtered by the search box. Derives from the store list so it tracks loads/socket refreshes.
    searchNumbers(): typeof this.conversationStore.conversations {
      const search = new RegExp(this.query, 'i')
      return this.conversationStore.conversations.filter(
        (item) =>
          search.test(item._id) || search.test(item.contact?.first_name ?? '') || search.test(item.contact?.last_name ?? '') || search.test(item.message ?? ''),
      )
    },
    // `totalCount` is a populated virtual present only on the detail (getOne/list) variant, not the create/delete one.
    activeTotalCount(): number {
      const p = this.profileStore.activeProfile
      return p && 'totalCount' in p ? (p.totalCount ?? 0) : 0
    },
  },
  watch: {
    // Selection changed: rebuild the inbox + settings form for the new profile and pull its detail (unread counts).
    // Gating on the id (not activeProfile) avoids a refetch loop, since refreshActiveProfile reassigns a same-id
    // object. immediate so a profile persisted in localStorage loads on mount -- its id doesn't "change".
    'profileStore.activeProfileId': {
      immediate: true,
      handler() {
        this.getNumberList()
        this.getSetting()
        void this.profileStore.refreshActiveProfile()
      },
    },
  },
  mounted() {
    void this.contactStore.loadContacts()
    PullToRefresh.init({
      mainElement: '.contact-list',
      triggerElement: '.contact-list',
      onRefresh: () => this.pullRefreshFunction(),
      distThreshold: 120,
      distMax: 140,
    })
  },
  methods: {
    formatTimestamp,
    pullRefreshFunction() {
      this.getNumberList()
      void this.profileStore.refreshActiveProfile()
      this.refreshProfile()
    },
    /** Open the add-contact modal prefilled with a number -- relays the Dashboard chat-header entry down to Contact. */
    openAddContact(phoneNumber: string) {
      this.contactComponent?.openWith(phoneNumber)
    },
    getValidString,
    refreshProfile() {
      this.profileView?.getAllProfiles()
    },
    selectConversation(item: Conversation) {
      this.$emit('conversationSelected', item)
    },
    logout() {
      this.userStore.logout()
      window.location.href = `/${appDirectory(this.$route)}/`
    },
    async getNumberList() {
      this.messageListLoader = true
      try {
        await this.conversationStore.loadConversations()
      } finally {
        this.messageListLoader = false
      }
    },
    hideShowDeleteIcon(response: any) {
      if (response.type === 'telnyx' && response.api_key) {
        this.showDelete = true
      } else if (response.type === 'twilio' && response.twilio_sid) {
        this.showDelete = true
      } else {
        this.showDelete = false
      }
    },
    getSetting() {
      const profile = this.profileStore.activeProfile
      if (!profile) return
      this.form = {
        type: profile.type,
        profile: profile.profile ?? '',
        api_key: profile.api_key ?? '',
        number: profile.number ?? '',
        twilio_sid: profile.twilio_sid ?? '',
        twilio_token: profile.twilio_token ?? '',
        twilio_number: profile.number ?? '',
      }
      this.hideShowDeleteIcon(profile)
      this.getNumbers(profile.type)
    },
    async deleteProfile() {
      const result = await this.$swal.fire({
        icon: 'info',
        title: 'Do you want to delete this Profile?',
        showDenyButton: true,
        showCancelButton: false,
        confirmButtonText: `Yes, Delete`,
        denyButtonText: `No`,
      })
      if (result.isDenied) {
        notifyInfo('Profile not deleted')
        return
      }
      if (!result.isConfirmed) return

      // Deletes, clears the selection, and reloads the profile list.
      await this.profileStore.deleteActiveProfile()
      notifySuccess('Profile deleted successfully!')
      this.r$.$reset({ toOriginalState: true }) // reset to empty
      this.telnyxNumbers = []
      this.twilioNumbers = []
      this.profileSettingModal?.hide()
      setTimeout(() => {
        this.profileView?.activeFirstProfile()
      }, 2000)
    },
    async deleteApiKey() {
      const result = await this.$swal.fire({
        icon: 'info',
        title: 'Do you want to delete this setting?',
        showDenyButton: true,
        showCancelButton: false,
        confirmButtonText: `Yes, Delete`,
        denyButtonText: `No`,
      })
      if (result.isDenied) {
        notifyInfo('setting not deleted')
        return
      }
      if (!result.isConfirmed) return

      const { data } = await request(client.api.profile[':id'].provider.$delete({ param: { id: this.profileStore.activeProfileId } }))
      notifySuccess('Key deleted successfully!')
      // Clear only the provider fields, keeping `profile`: the profile still exists (just its provider config is
      // gone) and the modal stays open, so its name must remain visible. A full reset would blank it.
      this.form = { ...this.form, api_key: '', number: '', twilio_sid: '', twilio_token: '', twilio_number: '' }
      this.telnyxNumbers = []
      this.twilioNumbers = []
      this.profileStore.setActiveProfile(data)
      this.hideShowDeleteIcon(data)
      this.profileView?.getAllProfiles()
    },
    async getNumbers(type: 'telnyx' | 'twilio') {
      const v = this.r$.$value
      if (type === 'telnyx') {
        this.telnyxNumbers = []
        const { data } = await request(client.api.setting['provider-numbers'].$post({ json: { type: 'telnyx', api_key: v.api_key } }))
        if (data.type !== 'telnyx') throw new Error('backend returned wrong number type')
        this.telnyxNumbers = data.numbers
      } else {
        this.twilioNumbers = []
        const { data } = await request(
          client.api.setting['provider-numbers'].$post({ json: { type: 'twilio', twilio_sid: v.twilio_sid, twilio_token: v.twilio_token } }),
        )
        if (data.type !== 'twilio') throw new Error('backend returned wrong number type')
        this.twilioNumbers = data.numbers
      }
    },
    async saveProviderSetting() {
      // dont use validated `data` because it would be weaker-typed here
      // its conditionally-required provider fields are MaybeOutput<string>, not string.
      const { valid } = await this.r$.$validate()
      if (!valid) return
      // r$.$value is reactive and the awaits below give the user a window to edit the form, so grab a snapshot
      const providerSettings = { ...this.r$.$value }
      const sid =
        providerSettings.type === 'telnyx'
          ? (this.telnyxNumbers.find((n) => n.phone_number === providerSettings.number)?.id ?? '')
          : (this.twilioNumbers.find((n) => n.phoneNumber === providerSettings.twilio_number)?.sid ?? '')
      const providerSettingPayload: ProviderSettingPayload = {
        api_key: providerSettings.api_key,
        number: providerSettings.number,
        sid,
        type: providerSettings.type,
        twilio_sid: providerSettings.twilio_sid,
        twilio_token: providerSettings.twilio_token,
        twilio_number: providerSettings.twilio_number,
        setting: this.profileStore.activeProfileId,
        profile: providerSettings.profile,
        override: true,
      }
      this.isLoading = true
      let isCall = false
      try {
        // number-lookup returns the provider's number record (typed loosely server-side)
        // a configured call webhook means call routing already exists, so we prompt before overriding it.
        if (providerSettings.type === 'telnyx') {
          const { data } = await request(
            client.api.provider['number-lookup'].$post({
              json: { type: 'telnyx', api_key: providerSettingPayload.api_key, number: providerSettingPayload.number, sid },
            }),
          )
          isCall = !!data.connection_id
        } else {
          const { data } = await request(
            client.api.provider['number-lookup'].$post({
              json: {
                type: 'twilio',
                twilio_sid: providerSettingPayload.twilio_sid,
                twilio_token: providerSettingPayload.twilio_token,
                twilio_number: providerSettingPayload.twilio_number,
                sid,
              },
            }),
          )
          isCall = !!data.voiceApplicationSid || !!data.voiceUrl
        }
      } finally {
        this.isLoading = false
      }
      // Prompt outside the loader block (matching the old fire-and-forget swal that ran after `finally`).
      if (isCall) {
        const result = await this.$swal.fire({
          icon: 'warning',
          title: 'Call Setting',
          text: 'The call setting is already available. Do you want to override the call setting?',
          showDenyButton: true,
          confirmButtonText: 'Yes, override it',
          denyButtonText: `No, Keep old`,
        })
        if (!result.isConfirmed && !result.isDenied) return
        providerSettingPayload.override = result.isConfirmed
      }
      await this.createProviderSetting(providerSettingPayload)
    },
    async createProviderSetting(providerSettingPayload: ProviderSettingPayload) {
      this.isLoading = true
      try {
        const { data } = await request(client.api.profile.provider.$post({ json: providerSettingPayload }))
        this.profileSettingModal?.hide()
        this.hideShowDeleteIcon(data)
        this.profileView?.getAllProfiles()
        this.profileStore.setActiveProfile(data)
        this.r$.$reset() // just-saved values are the new baseline
      } finally {
        this.isLoading = false
      }
    },
  },
})
</script>

<style scoped>
.contact {
  cursor: pointer;
}
.contact-list {
  min-height: calc(100vh - 105px);
}

.icons {
  font-size: 30px;
}
.chat_loader {
  width: 100%;
  max-width: 100%;
}
.droupdownAdd {
  margin-left: 0.255em;
  vertical-align: 0.255em;
  border-top: 0.3em solid;
  border-right: 0.3em solid transparent;
  border-bottom: 0;
  border-left: 0.3em solid transparent;
}
.overflow-visible-card {
  overflow: visible;
}
</style>

<!-- BModal internals are teleported, so this button-group rule can't be scoped. -->
<style>
#provider-type-radios > label > input {
  margin-right: 0.6rem;
}
</style>
