<template>
  <div>
    <div id="loader1" v-if="isLoading">
      <div class="d-flex loader justify-content-center align-items-center">
        <div class="sp sp-circle"></div>
      </div>
    </div>
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
              <b-icon
                font-scale="1"
                icon="telephone"
                aria-hidden="true"
                class="m-2"
                title="Call"
                @click="$bvModal.show('modal-tall')"
                style="cursor:pointer;"
              ></b-icon>
            </div>
            <div class="bd-highlight">
              <b-icon
                v-b-modal.modal-2
                font-scale="1"
                icon="pencil-square"
                aria-hidden="true"
                class="m-2"
                title="Compose"
                style="cursor:pointer;"
              ></b-icon>
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
                  <span v-if="userdata">{{ userdata.name }}</span>
                </div>
                <div>
                  <b-icon
                    font-scale="1"
                    icon="person-badge"
                    aria-hidden="true"
                    class="mx-2 my-auto"
                    title="Profiles"
                  ></b-icon>
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
              <b-icon icon="power" aria-hidden="true"></b-icon>
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
        <b-icon
          font-scale="2"
          icon="person-bounding-box"
          aria-hidden="true"
          class="mx-2 my-auto"
        ></b-icon>
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
            <span class="time">{{ item.created_at | moment("lll") }}</span>
            <!-- Jan 1, 2000 10:00 AM -->
            <span
              class="badge message_count bg-success"
              :id="item._id"
              v-if="item.isview > 0"
              >{{ item.isview }}</span
            >
          </div>
        </div>
      </div>
    </div>
    <!-- setting modal -->
    <b-modal ref="my-modal" id="modal-1" size="lg" title="Settings" hide-footer>
      <theme-button id-hide="false" />
      <form @submit.prevent="handleSubmit" class="ml-2 mr-2">
        <b-form-radio-group
          id="btn-radios-2"
          v-model="selected"
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
                  <b-icon icon="person-fill" aria-hidden="true"></b-icon>
                  Profile
                </label>
              </div>
              <div class="col-sm m-auto col-10">
                <input
                  class="form-control"
                  type="text"
                  placeholder="Alias/Name"
                  v-model="user.profile"
                  :class="{ 'is-invalid': submitted && $v.user.profile.$error }"
                />
                <div
                  v-if="submitted && $v.user.profile.$error"
                  class="invalid-feedback"
                >
                  <span v-if="!$v.user.profile.required"
                    >Profile is required</span
                  >
                </div>
              </div>
              <div class="col-1 m-auto">
                <span
                  class="float-right"
                  style="cursor: pointer"
                  title="Delete"
                >
                  <b-icon
                    @click="deleteProfile()"
                    font-scale="1.5"
                    icon="trash"
                    aria-hidden="true"
                  ></b-icon>
                </span>
              </div>
            </div>
          </div>
        </div>
        <div class="card form-group mt-4 overflow-visible-card" v-if="selected == 'telnyx'">
          <div class="card-body">
            <div class="row mb-2">
              <div class="col-auto m-auto">
                <label>
                  <b-icon icon="key" aria-hidden="true"></b-icon>
                  <b>Telnyx</b> API Key
                </label>
              </div>
              <div class="col-sm col-12 m-auto">
                <input
                  class="form-control"
                  type="text"
                  placeholder="Telnyx API Key"
                  v-model="user.api_key"
                  :class="{
                    'is-invalid':
                      submitted && $v.user.api_key.$error && user.profile == ''
                  }"
                />
                <div
                  v-if="
                    submitted && $v.user.api_key.$error && user.profile == ''
                  "
                  class="invalid-feedback"
                >
                  <span v-if="!$v.user.api_key.required"
                    >API Key is required</span
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
                  <b-icon icon="telephone-plus" aria-hidden="true"></b-icon>
                  Get Number
                </button>
              </div>
              <div class="col col-lg-6 m-auto">
                <div class="form-group">
                  <!-- <select
                    class=""
                    v-model="user.number"
                    :class="{
                      'is-invalid':
                        submitted && $v.user.number.$error && user.profile == ''
                    }"
                  >
                    <option
                      v-for="tNumber in tNumbers"
                      :key="tNumber.id"
                      :value="tNumber.phone_number"
                    >
                      {{ tNumber.phone_number }}
                    </option>
                  </select> -->
                  <custom-autocomplete-select
                    v-model="user.number"
                    :options="tNumbers"
                    labelProp="phone_number"
                    valueProp="phone_number"
                  ></custom-autocomplete-select>
                  <div
                    v-if="
                      submitted && $v.user.number.$error && user.profile == ''
                    "
                    class="invalid-feedback"
                  >
                    <span v-if="!$v.user.number.required"
                      >Number is required</span
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
                  <b-icon
                    font-scale="1.5"
                    icon="trash"
                    aria-hidden="true"
                  ></b-icon>
                </span>
              </div>
            </div>
          </div>
        </div>
        <div class="card form-group mt-4 overflow-visible-card" v-if="selected == 'twilio'">
          <div class="card-body">
            <div class="row mb-2">
              <div class="col-auto col-lg-3 m-auto">
                <label>
                  <b-icon icon="key" aria-hidden="true"></b-icon>
                  <b>Twilio</b> SID
                </label>
              </div>
              <div class="col-12 col-sm col-lg-9 m-auto">
                <input
                  class="form-control"
                  type="text"
                  placeholder="Twilio SID"
                  v-model="user.twilio_sid"
                  :class="{
                    'is-invalid':
                      submitted &&
                      $v.user.twilio_sid.$error &&
                      user.profile == ''
                  }"
                />
                <div
                  v-if="
                    submitted && $v.user.twilio_sid.$error && user.profile == ''
                  "
                  class="invalid-feedback"
                >
                  <span v-if="!$v.user.twilio_sid.required"
                    >Twilio sid is required</span
                  >
                </div>
              </div>
            </div>

            <div class="row mb-2">
              <div class="col-auto col-lg-3 m-auto">
                <label>
                  <b-icon icon="key" aria-hidden="true"></b-icon>
                  <b>Twilio</b> Token
                </label>
              </div>
              <div class="col-12 col-sm col-lg-9 m-auto">
                <input
                  class="form-control "
                  type="text"
                  placeholder="Twilio Token"
                  v-model="user.twilio_token"
                  :class="{
                    'is-invalid':
                      submitted &&
                      $v.user.twilio_token.$error &&
                      user.profile == ''
                  }"
                />
                <div
                  v-if="
                    submitted &&
                      $v.user.twilio_token.$error &&
                      user.profile == ''
                  "
                  class="invalid-feedback"
                >
                  <span v-if="!$v.user.twilio_token.required"
                    >Twilio token is required</span
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
                  <b-icon icon="telephone-plus" aria-hidden="true"></b-icon>
                  Get Number
                </button>
              </div>
              <div class="col col-lg-6 m-auto">
                <div class="form-group">
                  <custom-autocomplete-select
                  v-model="user.twilio_number"
                  :options="twilioNumbers"
                  labelProp="phoneNumber"
                  valueProp="phoneNumber"
                ></custom-autocomplete-select>
                  <!-- <select
                    class=""
                    v-model="user.twilio_number"
                    :class="{
                      'is-invalid':
                        submitted &&
                        $v.user.twilio_number.$error &&
                        user.profile == ''
                    }"
                  >
                    <option
                      v-for="twilioNumber in twilioNumbers"
                      :key="twilioNumber.sid"
                      :value="twilioNumber.phoneNumber"
                      >{{ twilioNumber.phoneNumber }}</option
                    >
                  </select> -->
                  <div
                    v-if="
                      submitted &&
                        $v.user.twilio_number.$error &&
                        user.profile == ''
                    "
                    class="invalid-feedback"
                  >
                    <span v-if="!$v.user.twilio_number.required"
                      >Number is required</span
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
                  <b-icon
                    font-scale="1.5"
                    icon="trash"
                    aria-hidden="true"
                  ></b-icon>
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

<script>
import ThemeButton from "@/components/ThemeButton.vue";
import ProfileView from "@/components/setting/ProfileView.vue";
import Contact from "@/components/setting/Contact.vue";
import { required } from "vuelidate/lib/validators";
import { get, post } from "../../core/module/common.module";
import { notifySuccess, notifyInfo } from "@/notify";
import PullToRefresh from "pulltorefreshjs";
import Setting from "@/components/setting/Setting.vue";
import { EventBus } from "@/event-bus";
import CustomAutocompleteSelect from "../CustomAutocompleteSelect.vue";

export default {
  components: {
    ProfileView,
    ThemeButton,
    Contact,
    Setting,
    CustomAutocompleteSelect
  },
  data() {
    return {
      user: {
        api_key: "",
        number: "",
        twilio_sid: "",
        twilio_token: "",
        twilio_number: "",
        profile: ""
      },
      query: "",
      isLoading: false,
      contacts: [],
      activeChat: "",
      submitted: false,
      messageListLoader: true,
      numbers: [],
      search_numbers: [],
      userdata: null,
      activeProfile: null,
      tNumbers: [],
      twilioNumbers: [],
      activeItem: null,
      options: [
        { text: "Telnyx", value: "telnyx" },
        { text: "Twilio", value: "twilio" }
      ],
      selected: "telnyx",
      showDelete: false
    };
  },
  validations: {
    user: {
      api_key: { required },
      number: { required },
      twilio_sid: { required },
      twilio_token: { required },
      twilio_number: { required },
      profile: { required }
    }
  },
  mounted() {
    this.userdata = JSON.parse(this.$cookie.get("userdata"));
    this.onaddContact();
    PullToRefresh.init({
      mainElement: ".contact-list",
      triggerElement: ".contact-list",
      onRefresh: () => this.pullRefreshFunction(),
      distThreshold: 120,
      distMax: 140
    });
    EventBus.$on("getOneProfile", () => this.getOneProfile());
    EventBus.$on("contactAdded", number => {
      this.getNumberList();
      setTimeout(() => {
        if (number === "delete" || this.activeItem._id === number) {
          const numberClass = document.getElementsByClassName(`activeChat`);
          if (numberClass.length > 0) {
            numberClass[0].click();
          }
        }
      }, 1500);
    });
  },
  methods: {
    pullRefreshFunction() {
      this.getNumberList();
      this.getOneProfile();
      this.refreshProfile();
    },
    searchContact() {
      // console.log(this.numbers)
      const search = new RegExp(this.query, "i");
      this.search_numbers = this.numbers.filter(item => {
        if (search.test(item._id)) {
          return search.test(item._id);
        } else if (item.contact && search.test(item.contact.first_name)) {
          return search.test(item.contact.first_name);
        } else if (item.contact && search.test(item.contact.last_name)) {
          return search.test(item.contact.last_name);
        } else if (search.test(item.message)) {
          return search.test(item.message);
        }
      });
    },
    onaddContact() {
      const request = {
        url: "contact/get-all"
      };
      this.$store
        .dispatch(get, request)
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
    getValidString(str) {
      let newStr2
      if (str.length > 10) {
        newStr2 = str.substring(0, str.length - (str.length - 10)) + "..";
      } else {
        newStr2 = str;
      }
      return newStr2;
    },
    getOneProfile() {
      if (this.activeProfile?._id !== undefined) {
        const request = {
          data: { setting: this.activeProfile._id },
          url: "profile/getdata-one"
        };
        this.$store
          .dispatch(post, request)
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
      this.$refs.childComponent.getallProfile();
    },
    onClickChild(value) {
      this.activeProfile = value;
      this.messageListLoader = true;
      this.getNumberList();
      value.refresh = true;
      this.$emit("activeChat", value);
      this.getSetting();
    },
    firstChatShow(id) {
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
      this.$cookie.delete("access_token");
      this.$cookie.delete("userdata");
      window.location.href = `/${this.$route.params.appdirectory}/`;
    },
    getNumberList() {
      this.numbers = [];
      const request = {
        data: { user: this.userdata._id, setting: this.activeProfile._id },
        url: "setting/sms-number-list"
      };
      this.$store
        .dispatch(post, request)
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
    hideShowDeleteIcon(response) {
      if (response.type === "telnyx" && response.api_key) {
        this.showDelete = true;
      } else if (response.type === "twilio" && response.twilio_sid) {
        this.showDelete = true;
      } else {
        this.showDelete = false;
      }
    },
    getSetting() {
      const request = {
        data: { user: this.userdata._id, setting: this.activeProfile._id },
        url: "setting/get-setting"
      };
      this.$store
        .dispatch(post, request)
        .then(response => {
          if (response?.data) {
            this.user = response.data;
            this.hideShowDeleteIcon(response.data);
            this.user.twilio_number = response.data.number;
            this.getNumbers(response.data.type);
            this.selected = response.data.type;
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

      const request = {
        data: {
          user: this.userdata._id,
          profile_id: this.activeProfile._id
        },
        url: "profile/delete-profile"
      };
      try {
        const response = await this.$store.dispatch(post, request);
        if (response.data) {
          notifySuccess("Profile deleted successfully!");
          this.user.api_key = "";
          this.user.number = "";
          this.user.twilio_sid = "";
          this.user.twilio_token = "";
          this.user.twilio_number = "";
          this.tNumbers = [];
          this.twilioNumbers = [];
          this.activeProfile = response.data;
          localStorage.removeItem("activeProfile");
          this.$refs["my-modal"].hide();
          this.$refs.childComponent.getallProfile();
          setTimeout(() => {
            this.$refs.childComponent.activeFirstProfile();
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

      const request = {
        data: {
          user: this.userdata._id,
          profile_id: this.activeProfile._id
        },
        url: "setting/delete-key"
      };
      try {
        const response = await this.$store.dispatch(post, request);
        notifySuccess("Key deleted successfully!");
        this.user.api_key = "";
        this.user.number = "";
        this.user.twilio_sid = "";
        this.user.twilio_token = "";
        this.user.twilio_number = "";
        this.tNumbers = [];
        this.twilioNumbers = [];
        this.activeProfile = response.data;
        this.hideShowDeleteIcon(response.data);
        this.$refs.childComponent.getallProfile();
      } catch (e) {
        console.error(e);
      }
    },
    getNumbers(type) {
      const settings = this.user;
      settings.type = type;
      const request = {
        data: settings,
        url: "setting/get-number"
      };
      if (type === "telnyx") {
        this.tNumbers = [];
      } else {
        this.twilioNumbers = [];
      }
      this.$store
        .dispatch(post, request)
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
    async handleSubmit() {
      this.submitted = true;
      this.$v.$touch();
      if (
        this.user.profile !== "" ||
        (this.selected === "telnyx" &&
          !this.$v.user.api_key.$error &&
          !this.$v.user.number.$error &&
          !this.$v.user.profile.$error) ||
        (this.selected === "twilio" &&
          !this.$v.user.twilio_sid.$error &&
          !this.$v.user.twilio_token.$error &&
          !this.$v.user.twilio_number.$error &&
          !this.$v.user.profile.$error)
      ) {
        let sid = "";
        if (this.selected === "telnyx") {
          for (let i = 0; i < this.tNumbers.length; i++) {
            if (this.tNumbers[i].phone_number === this.user.number) {
              sid = this.tNumbers[i].id;
            }
          }
        } else {
          for (let j = 0; j < this.twilioNumbers.length; j++) {
            if (this.twilioNumbers[j].phoneNumber === this.user.twilio_number) {
              sid = this.twilioNumbers[j].sid;
            }
          }
        }
        const sendData = {
          api_key: this.user.api_key,
          number: this.user.number,
          user: this.userdata._id,
          sid,
          type: this.selected,
          twilio_sid: this.user.twilio_sid,
          twilio_token: this.user.twilio_token,
          twilio_number: this.user.twilio_number,
          setting: this.activeProfile._id,
          profile: this.user.profile
        };
        this.isLoading = true;
        const request = {
          data: sendData,
          url: "setting/check-setting"
        };
        try {
          const response = await this.$store.dispatch(post, request);
          let isCall = false;
          if (response) {
            if (
              this.selected === "telnyx" &&
              response.data.data.connection_id !== undefined &&
              response.data.data.connection_id &&
              response.data.data.connection_id !== ""
            ) {
              isCall = true;
            }

            if (this.selected === "twilio") {
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
                    sendData.override = "true";
                  } else if (result.isDenied) {
                    updateCallSetting = true;
                    sendData.override = "false";
                  }
                  if (updateCallSetting) this.submitCreateSetting(sendData);
                });
            } else {
              sendData.override = "true";
              await this.submitCreateSetting(sendData);
            }
          }
        } catch (e) {
          console.error(e);
        } finally {
          this.isLoading = false;
        }
      }
    },
    async submitCreateSetting(sendData) {
      this.isLoading = true;
      try {
        const response = await this.$store.dispatch(post, { data: sendData, url: "setting/create" });
        if (response) {
          this.$refs["my-modal"].hide();
          this.activeProfile = response.data;
          this.hideShowDeleteIcon(response.data);
          this.$refs.childComponent.getallProfile();
          EventBus.$emit("changeProfile2", true);
          this.$v.$reset();
        }
      } catch (e) {
        console.error(e);
      } finally {
        this.isLoading = false;
      }
    }
  }
};
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
.sp {
  width: 32px;
  height: 32px;
  clear: both;
  margin: 20px auto;
}

/* Spinner Circle Rotation */
.sp-circle {
  border: 4px rgba(0, 0, 0, 0.25) solid;
  border-top: 4px black solid;
  border-radius: 50%;
  -webkit-animation: spCircRot 0.6s infinite linear;
  animation: spCircRot 0.6s infinite linear;
}

@-webkit-keyframes spCircRot {
  from {
    -webkit-transform: rotate(0deg);
  }
  to {
    -webkit-transform: rotate(359deg);
  }
}
@keyframes spCircRot {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(359deg);
  }
}
#loader1 {
  position: absolute;
  background: white;
  height: 100%;
  width: 100%;
  z-index: 2050;
  top: 0;
  left: 0;
  opacity: 0.3;
}
.loader {
  height: 100%;
  width: 100%;
  z-index: 2100;
}
.overflow-visible-card{
  overflow: visible;
}
</style>
