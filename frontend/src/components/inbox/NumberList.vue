<template>
  <div>
    <loading-spinner :show="isLoading" />
    <div class="profile">
      <div
        class="d-flex flex-row bd-highlight align-items-center align-self-center"
      >
        <div class="mt-2">
          <div class="d-flex flex-row bd-highlight">
            <setting></setting>
            <div class="bd-highlight">
              <contact
                :contacts="contacts"
                @onaddContact="onaddContact"
              ></contact>
            </div>
            <div class="bd-highlight">
              <i-bi-telephone
                aria-hidden="true"
                class="m-2"
                title="Call"
                v-b-modal.modal-tall
                style="cursor:pointer;"
              />
            </div>
            <div class="bd-highlight">
              <i-bi-pencil-square
                v-b-modal.modal-2
                aria-hidden="true"
                class="m-2"
                title="Compose"
                style="cursor:pointer;"
              />
            </div>
          </div>
        </div>
        <div class="icons mt-2">
          <b-dropdown class="dropDown" variant="primary">
            <template #button-content>
              <div class="d-flex flex-row align-items-center bd-highlight">
                <div
                  v-if="activeProfile"
                  class="d-flex flex-column bd-highlight"
                >
                  <div class="profileName">{{ activeProfile.profile }}</div>
                  <div class="profileNum">{{ activeProfile.number }}</div>
                  <span
                    v-if="activeProfile.totalCount > 0"
                    class="position-absolute top-0 start-100 translate-middle badge border border-light rounded-circle bg-danger p-2"
                    ><span class="visually-hidden">unread messages</span></span
                  >
                </div>
                <div v-else>
                  <span v-if="userStore.userData">{{ userStore.userData.name }}</span>
                </div>
                <div>
                  <i-bi-person-badge
                    aria-hidden="true"
                    class="mx-2 my-auto"
                    title="Profiles"
                  />
                </div>
                <div class="droupdownAdd"></div>
              </div>
            </template>
            <b-dropdown-divider></b-dropdown-divider>
            <profile-view
              ref="childComponent"
              @clicked="onClickChild"
            />
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
        <input
          type="text"
          class="input-search"
          v-model="query"
          @keyup="searchContact()"
          placeholder="Search"
        />
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
      <div
        v-for="item in search_numbers"
        :key="item._id"
        class="contact"
        :id="`phone${item._id}`"
        v-on:click="firstChatShow(item)"
        v-bind:class="{ activeChat: activeChat == item._id }"
      >
        <i-bi-person-bounding-box
          aria-hidden="true"
          class="mx-2 my-auto"
          style="font-size: 2em"
        />
        <div class="d-flex justify-content-between" style="width:100%">
          <div class="contact-preview">
            <div class="contact-text">
              <h1 class="font-name" v-if="item.contact">
                {{ item.contact.first_name }} {{ item.contact.last_name }}
              </h1>
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
            <span
              class="badge message_count bg-success"
              :id="item._id"
              v-if="(item.isview ?? 0) > 0"
              >{{ item.isview }}</span
            >
          </div>
        </div>
      </div>
    </div>
    <!-- todo: extract this modal into its own component? -->
    <b-modal ref="profileSettingModal" id="profile-setting-modal" size="lg" title="Settings" hide-footer>
      <theme-button id-hide="false" />
      <form @submit.prevent="saveProviderSetting" class="ml-2 mr-2">
        <b-form-radio-group
          id="btn-radios-2"
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
                <input
                  class="form-control"
                  type="text"
                  placeholder="Alias/Name"
                  v-model="r$.$value.profile"
                  :class="{ 'is-invalid': r$.profile.$error }"
                />
                <div
                  v-if="r$.profile.$error"
                  class="invalid-feedback"
                >
                  <span v-for="error of r$.$errors.profile" :key="error"
                    >{{ error }}</span
                  >
                </div>
              </div>
              <div class="col-1 m-auto">
                <span
                  class="float-right"
                  style="cursor: pointer"
                  title="Delete"
                >
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
                <input
                  class="form-control"
                  type="text"
                  placeholder="Telnyx API Key"
                  v-model="r$.$value.api_key"
                  :class="{ 'is-invalid': r$.api_key.$error }"
                />
                <div
                  v-if="r$.api_key.$error"
                  class="invalid-feedback"
                >
                  <span v-for="error of r$.$errors.api_key" :key="error"
                    >{{ error }}</span
                  >
                </div>
              </div>
            </div>
            <div class="row mb-2">
              <div class="col-auto m-auto">
                <button
                  class="dark-mode btn btn-secondary btn-sm"
                  type="button"
                  id="get-number"
                  @click="getNumbers('telnyx')"
                >
                  <i-bi-telephone-plus aria-hidden="true" />
                  Get Number
                </button>
              </div>
              <div class="col col-lg-6 m-auto">
                <div class="form-group">
                  <custom-autocomplete-select
                    v-model="r$.$value.number"
                    :options="tNumbers"
                    labelProp="phone_number"
                    valueProp="phone_number"
                  ></custom-autocomplete-select>
                  <div
                    v-if="r$.number.$error"
                    class="invalid-feedback"
                  >
                    <span v-for="error of r$.$errors.number" :key="error"
                      >{{ error }}</span
                    >
                  </div>
                </div>
              </div>
              <div class="col-auto m-auto">
                <span
                  class="float-right"
                  style="cursor: pointer"
                  @click="deleteApiKey()"
                  title="Delete"
                  v-if="showDelete"
                >
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
                <div
                  v-if="r$.twilio_sid.$error"
                  class="invalid-feedback"
                >
                  <span v-for="error of r$.$errors.twilio_sid" :key="error"
                    >{{ error }}</span
                  >
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
                  class="form-control "
                  type="text"
                  placeholder="Twilio Token"
                  v-model="r$.$value.twilio_token"
                  :class="{ 'is-invalid': r$.twilio_token.$error }"
                />
                <div
                  v-if="r$.twilio_token.$error"
                  class="invalid-feedback"
                >
                  <span v-for="error of r$.$errors.twilio_token" :key="error"
                    >{{ error }}</span
                  >
                </div>
              </div>
            </div>
            <div class="row mb-2">
              <div class="col-auto m-auto">
                <button
                  class="dark-mode btn btn-secondary btn-sm"
                  type="button"
                  id="get-number-twilio"
                  @click="getNumbers('twilio')"
                >
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
                  <div
                    v-if="r$.twilio_number.$error"
                    class="invalid-feedback"
                  >
                    <span v-for="error of r$.$errors.twilio_number" :key="error"
                      >{{ error }}</span
                    >
                  </div>
                </div>
              </div>
              <div class="col-auto m-auto">
                <span
                  class="float-right"
                  style="cursor: pointer;"
                  @click="deleteApiKey()"
                  title="Delete"
                  v-if="showDelete"
                >
                  <i-bi-trash style="font-size: 1.5em" aria-hidden="true" />
                </span>
              </div>
            </div>
          </div>
        </div>
        <div class="d-grid d-md-flex">
          <button class="btn btn-success mt-4" type="submit" id="login-button">
            Save
          </button>
        </div>
      </form>
    </b-modal>
  </div>
</template>

<script lang="ts">
/**
 * Still on the legacy `this.$get/$post/$del` API plugin (core/api.plugin.ts), so these calls are untyped -- unlike the
 * components migrated to the typed RPC client.
 *
 * this component contains the telnyx/twilio modal when you click settings->profile settings
 *
 * TODO: this modal does two jobs and guesses intent from `profile === ""`. Split into two single-purpose flows:
 *   1. createProfile(name):     form = { profile: required }          -> POST profile; make it active
 *   2. configureProvider():     variant on `type`, provider fields required (active profile assumed, name
 *                               shown read-only)                       -> POST setting/profiles
 * Then neither form needs requiredIf/`configuringProvider`; step 1 can reuse ProfileView's create flow.
 */
import { defineComponent, ref, useTemplateRef } from "vue";
import type { BModal } from "bootstrap-vue-next";
import { useProfileStore } from "@/stores/profile.ts";
import { useUserStore } from "@/stores/user.ts";
import ThemeButton from "@/components/ThemeButton.vue";
import LoadingSpinner from "@/components/LoadingSpinner.vue";
import ProfileView from "@/components/setting/ProfileView.vue";
import Contact from "@/components/setting/Contact.vue";
import { useRegle, createVariant } from "@regle/core";
import { required, requiredIf, literal, withMessage } from "@regle/rules";
import { notifySuccess, notifyInfo } from "@/notify.ts";
import PullToRefresh from "pulltorefreshjs";
import Setting from "@/components/setting/Setting.vue";
import { EventBus } from "@/event-bus.ts";
import CustomAutocompleteSelect from "../CustomAutocompleteSelect.vue";
import { formatTimestamp } from "@/helper.ts";
import type { Conversation } from "@shared/api-contracts.ts";
import { appDirectory } from "@/router/helpers.ts";

function getValidString(str: string): string {
  return str.length > 10 ? str.substring(0, 10) + ".." : str;
}

/** A profile's provider configuration, as edited in the settings modal. `type` discriminates which provider's fields the variant rules require. */
interface ProviderSettingForm {
  type: 'telnyx' | 'twilio';
  profile: string;
  api_key: string;
  number: string;
  twilio_sid: string;
  twilio_token: string;
  twilio_number: string;
}
/** A purchasable Telnyx number from the provider-numbers lookup (`id` is the lookup's sid). */
interface TelnyxNumber {
  id: string;
  phone_number: string;
}
/** A purchasable Twilio number from the provider-numbers lookup. */
interface TwilioNumber {
  sid: string;
  phoneNumber: string;
}
/** The form values plus server-side identifiers, POSTed to number-lookup / setting creation. */
interface ProviderSettingPayload extends ProviderSettingForm {
  user: string | undefined;
  setting: string;
  sid: string;
  override?: string;
}

export default defineComponent({
  emits: ["onaddContact", "activeChat", "clicked"],
  components: {
    ProfileView,
    LoadingSpinner,
    ThemeButton,
    Contact,
    Setting,
    CustomAutocompleteSelect
  },
  setup() {
    const form = ref<ProviderSettingForm>({
      type: "telnyx",
      profile: "",
      api_key: "",
      number: "",
      twilio_sid: "",
      twilio_token: "",
      twilio_number: ""
    });
    // Provider fields are required only when no profile name is entered (i.e. configuring the active profile's provider).
    const requiredWhenConfiguring = (msg: string) => withMessage(requiredIf(() => !form.value.profile), msg);
    const { r$ } = useRegle(form, () => {
      const provider = createVariant(form, "type", [
        {
          type: { literal: literal("telnyx") },
          api_key: { required: requiredWhenConfiguring("API Key is required") },
          number: { required: requiredWhenConfiguring("Number is required") }
        },
        {
          type: { literal: literal("twilio") },
          twilio_sid: { required: requiredWhenConfiguring("Twilio sid is required") },
          twilio_token: { required: requiredWhenConfiguring("Twilio token is required") },
          twilio_number: { required: requiredWhenConfiguring("Number is required") }
        }
      ]);
      return {
        profile: { required: withMessage(required, "Profile is required") },
        ...provider.value
      };
    });
    const childComponent = useTemplateRef<InstanceType<typeof ProfileView>>("childComponent");
    const profileSettingModal = useTemplateRef<InstanceType<typeof BModal>>("profileSettingModal");
    return { r$, form, profileStore: useProfileStore(), userStore: useUserStore(), childComponent, profileSettingModal };
  },
  data() {
    return {
      query: "",
      isLoading: false, // todo: fixme
      contacts: [] as any[],
      activeChat: "",
      messageListLoader: true,
      numbers: [] as Conversation[],
      search_numbers: [] as Conversation[],
      activeProfile: null as any, // todo: replace with profileStore
      tNumbers: [] as TelnyxNumber[],
      twilioNumbers: [] as TwilioNumber[],
      activeItem: null as any,
      options: [
        { text: "Telnyx", value: "telnyx" },
        { text: "Twilio", value: "twilio" }
      ],
      showDelete: false
    };
  },
  watch: {
    "profileStore.activeProfile"() {
      this.getOneProfile();
    }
  },
  mounted() {
    this.onaddContact();
    PullToRefresh.init({
      mainElement: ".contact-list",
      triggerElement: ".contact-list",
      onRefresh: () => this.pullRefreshFunction(),
      distThreshold: 120,
      distMax: 140
    });
    EventBus.$on("contactAdded", (number: any) => {
      this.getNumberList();
      setTimeout(() => {
        if (number === "delete" || this.activeItem._id === number) {
          const numberClass = document.getElementsByClassName(`activeChat`);
          if (numberClass.length > 0) {
            (numberClass[0] as HTMLElement).click();
          }
        }
      }, 1500);
    });
  },
  methods: {
    formatTimestamp,
    pullRefreshFunction() {
      this.getNumberList();
      this.getOneProfile();
      this.refreshProfile();
    },
    searchContact() {
      const search = new RegExp(this.query, "i");
      this.search_numbers = this.numbers.filter(item =>
        search.test(item._id) ||
        search.test(item.contact?.first_name ?? "") ||
        search.test(item.contact?.last_name ?? "") ||
        search.test(item.message ?? "")
      );
    },
    onaddContact() {
      // todo: type this api response
      this.$get("contact")
        .then(data => {
          if (data) {
            this.contacts = data.data;
            this.$emit("onaddContact", data.data);
          }
        })
        .catch(e => {
          console.error(e);
        });
    },
    getValidString,
    getOneProfile() {
      if (this.activeProfile?._id !== undefined) {
        this.$get(`profile/${this.activeProfile._id}`)
          .then(response => {
            if (response) {
              this.activeProfile = response.data;
            }
          })
          .catch(e => {
            console.error(e);
          });
      }
    },
    refreshProfile() {
      this.childComponent?.getAllProfiles();
    },
    onClickChild(value: any) {
      this.activeProfile = value;
      this.getNumberList();
      value.refresh = true;
      this.$emit("activeChat", value);
      this.getSetting();
    },
    firstChatShow(id: any) {
      const element = document.getElementById(id.id);
      if (element) {
        element.style.display = "none";
      }
      this.activeChat = id._id;
      this.activeItem = id;
      localStorage.setItem("activenumber", JSON.stringify(id));
      this.$emit("clicked", id);
    },
    logout() {
      this.userStore.logout();
      window.location.href = `/${appDirectory(this.$route)}/`;
    },
    getNumberList() {
      this.numbers = [];
      this.messageListLoader = true;
      this.$get("setting/conversations?profile=" + this.activeProfile._id)
        .then(response => {
          if (response) {
            this.numbers = response;
            this.messageListLoader = false;
            this.searchContact();
          }
        })
        .catch(e => {
          console.error(e);
        });
    },
    hideShowDeleteIcon(response: any) {
      if (response.type === "telnyx" && response.api_key) {
        this.showDelete = true;
      } else if (response.type === "twilio" && response.twilio_sid) {
        this.showDelete = true;
      } else {
        this.showDelete = false;
      }
    },
    getSetting() {
      this.$get("setting/profiles/" + this.activeProfile._id)
        .then(response => {
          if (response?.data) {
            this.form = response.data;
            this.hideShowDeleteIcon(response.data);
            this.form.twilio_number = response.data.number;
            this.getNumbers(response.data.type);
          }
        })
        .catch(e => {
          console.error(e);
        });
    },
    async deleteProfile() {
      const result = await this.$swal.fire({
        icon: "info",
        title: "Do you want to delete this Profile?",
        showDenyButton: true,
        showCancelButton: false,
        confirmButtonText: `Yes, Delete`,
        denyButtonText: `No`
      });
      if (result.isDenied) {
        notifyInfo("Profile not deleted");
        return;
      }
      if (!result.isConfirmed) return;

      try {
        const response = await this.$del(`profile/${this.activeProfile._id}`);
        if (response.data) {
          notifySuccess("Profile deleted successfully!");
          this.r$.$reset({ toOriginalState: true }); // reset to empty
          this.tNumbers = [];
          this.twilioNumbers = [];
          this.activeProfile = response.data;
          localStorage.removeItem("activeProfile");
          this.profileSettingModal?.hide();
          this.childComponent?.getAllProfiles();
          setTimeout(() => {
            this.childComponent?.activeFirstProfile();
          }, 2000);
        }
      } catch (e) {
        console.error(e);
      }
    },
    async deleteApiKey() {
      const result = await this.$swal.fire({
        icon: "info",
        title: "Do you want to delete this setting?",
        showDenyButton: true,
        showCancelButton: false,
        confirmButtonText: `Yes, Delete`,
        denyButtonText: `No`
      });
      if (result.isDenied) {
        notifyInfo("setting not deleted");
        return;
      }
      if (!result.isConfirmed) return;

      try {
        const response = await this.$del("setting/profiles/" + this.activeProfile._id + "/provider");
        notifySuccess("Key deleted successfully!");
        // Clear only the provider fields, keeping `profile`: the profile still exists (just its provider config is
        // gone) and the modal stays open, so its name must remain visible. A full reset would blank it.
        this.form = { ...this.form, api_key: "", number: "", twilio_sid: "", twilio_token: "", twilio_number: "" };
        this.tNumbers = [];
        this.twilioNumbers = [];
        this.activeProfile = response.data;
        this.hideShowDeleteIcon(response.data);
        this.childComponent?.getAllProfiles();
      } catch (e) {
        console.error(e);
      }
    },
    getNumbers(type: 'telnyx' | 'twilio') {
      const providerSettings = this.r$.$value;
      providerSettings.type = type;
      if (type === "telnyx") {
        this.tNumbers = [];
      } else {
        this.twilioNumbers = [];
      }
      this.$post("setting/provider-numbers", providerSettings)
        .then(response => {
          if (response) {
            if (type === "telnyx") {
              this.tNumbers = response.data.data;
            } else {
              this.twilioNumbers = response.data;
            }
          }
        })
        .catch(e => {
          console.error(e);
        });
    },
    async saveProviderSetting() {
      // $validate marks all fields dirty (surfacing errors) and returns whether the form passes its rules.
      const { valid } = await this.r$.$validate();
      if (!valid) return;
      // r$.$value is reactive and the awaits below give the user a window to edit the form; snapshot the flat
      // string values so the payload reflects exactly what was validated. (`data` would be weaker-typed here:
      // its conditionally-required provider fields are MaybeOutput<string>, not string.)
      const providerSettings = { ...this.r$.$value };
      const sid = providerSettings.type === "telnyx"
        ? (this.tNumbers.find(n => n.phone_number === providerSettings.number)?.id ?? "")
        : (this.twilioNumbers.find(n => n.phoneNumber === providerSettings.twilio_number)?.sid ?? "");
      const providerSettingPayload: ProviderSettingPayload = {
        api_key: providerSettings.api_key,
        number: providerSettings.number,
        user: this.userStore.userData?._id,
        sid,
        type: providerSettings.type,
        twilio_sid: providerSettings.twilio_sid,
        twilio_token: providerSettings.twilio_token,
        twilio_number: providerSettings.twilio_number,
        setting: this.activeProfile._id,
        profile: providerSettings.profile
      };
      this.isLoading = true;
      try {
        const response = await this.$post("provider/number-lookup", providerSettingPayload);
        let isCall = false;
        if (response) {
          if (
            providerSettings.type === "telnyx" &&
            response.data.data.connection_id !== undefined &&
            response.data.data.connection_id &&
            response.data.data.connection_id !== ""
          ) {
            isCall = true;
          }

          if (providerSettings.type === "twilio") {
            let appSidavilable = false;
            if (
              response.data.voiceApplicationSid !== undefined &&
              response.data.voiceApplicationSid &&
              response.data.voiceApplicationSid !== ""
            ) {
              isCall = true;
              appSidavilable = true;
            }
            if (!appSidavilable) {
              if (
                response.data.voiceUrl !== undefined &&
                response.data.voiceUrl &&
                response.data.voiceUrl !== ""
              ) {
                isCall = true;
              }
            }
          }
          if (isCall) {
            // runs after the `finally` block which sets `isLoading = false`
            this.$swal
              .fire({
                icon: "warning",
                title: "Call Setting",
                text: "The call setting is already available. Do you want to override the call setting?",
                showDenyButton: true,
                confirmButtonText: "Yes, override it",
                denyButtonText: `No, Keep old`
              })
              .then(result => {
                let updateCallSetting = false;
                if (result.isConfirmed) {
                  updateCallSetting = true;
                  providerSettingPayload.override = "true";
                } else if (result.isDenied) {
                  updateCallSetting = true;
                  providerSettingPayload.override = "false";
                }
                if (updateCallSetting) this.createProviderSetting(providerSettingPayload);
              });
          } else {
            providerSettingPayload.override = "true";
            await this.createProviderSetting(providerSettingPayload);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        this.isLoading = false;
      }
    },
    async createProviderSetting(providerSettingPayload: ProviderSettingPayload) {
      this.isLoading = true;
      try {
        const response = await this.$post("setting/profiles", providerSettingPayload);
        if (response) {
          this.profileSettingModal?.hide();
          this.activeProfile = response.data;
          this.hideShowDeleteIcon(response.data);
          this.childComponent?.getAllProfiles();
          this.profileStore.setActiveProfile(response.data);
          this.r$.$reset(); // just-saved values are the new baseline
        }
      } catch (e) {
        console.error(e);
      } finally {
        this.isLoading = false;
      }
    }
  }
});
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
.overflow-visible-card{
  overflow: visible;
}
</style>
