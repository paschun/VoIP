<template>
  <div id="wrapbody" class="wrap">
    <check-dir />
    <call-view
      :contacts="contacts"
      ref="callView"
      v-if="activeCallTab"
    ></call-view>
    <loading-spinner :show="isLoading" />
    <theme-button id-hide="true"></theme-button>
    <!-- b-offcanvas has responsive prop ="md" -->
    <b-offcanvas
      v-if="vw < 576"
      class="d-sm-none"
      id="sidebar-no-header"
      ref="mobileSidebar"
      aria-labelledby="sidebar-no-header-title"
      no-header
      shadow
      model-value
    >
      <template #default="{ hide }">
        <div class="d-flex flex-row-reverse bd-highlight">
          <div class="bd-highlight dropDown">
            <b-button class="float-right d-flex" size="sm" variant="primary">
              <i-bi-x @click="hide()" />
            </b-button>
          </div>
        </div>
        <number-list
          ref="numberList"
          @onaddContact="onaddContact"
          @activeChat="activeProfileView"
          @clicked="onClickChild"
        />
      </template>
    </b-offcanvas>
    <section class="col-auto col-md-4 d-none d-sm-block">
      <number-list
        ref="numberList"
        @onaddContact="onaddContact"
        @activeChat="activeProfileView"
        @clicked="onClickChild"
        v-if="vw >= 576"
      />
    </section>
    <section class="col col-md-8 pb-2" id="drop-area1">
      <div class="chat-head">
        <i-bi-chevron-left
          aria-hidden="true"
          class="mx-3 my-auto d-sm-none h2"
          style="font-size: 2em"
          v-b-toggle.sidebar-no-header
        />
        <i-bi-person-bounding-box
          aria-hidden="true"
          class="mx-2 my-auto"
          style="font-size: 2em"
        />
        <div class="chat-name">
          <h1 class="font-name" v-if="activeChat">
            <div
              class="d-flex align-items-start align-self-center"
              v-if="activeChat.contact"
            >
              <div class="mt-2 ml-4">
                {{ activeChat.contact.first_name }}
                {{ activeChat.contact.last_name }}
              </div>
            </div>
            <div class="d-flex align-items-start align-self-center">
              <div class="mt-2 ml-4">{{ activeChat._id }}</div>
              &nbsp;&nbsp;&nbsp;
              <span
                style="cursor: copy"
                title="Add Contact"
                @click="addContact(activeChat._id)"
                v-if="!activeChat.contact"
              >
                <i-bi-plus-circle
                  aria-hidden="true"
                  style="font-size: 1.5em"
                />
              </span>
            </div>
          </h1>
        </div>
        <div class="d-flex m-auto" v-if="activeChat">
          <span style="cursor: pointer" @click="makeCall()" title="Delete">
            <i-bi-telephone aria-hidden="true" style="font-size: 2em" />
          </span>
          &nbsp;&nbsp;&nbsp;
          <span style="cursor: pointer" @click="deleteChat()" title="Delete">
            <i-bi-trash aria-hidden="true" style="font-size: 2em" />
          </span>
        </div>
      </div>
      <div :class="(!activeChat || modelMms) ? 'd-none' : ''">
        <div
          id="drop-area"
          style="z-index: 1"
          :class="uploadedImages.length ? 'activeImageArea' : 'inactive'"
        >
          <form class="my-form">
            <p>
              Upload multiple files by dragging and dropping images inside this
              box
            </p>
            <div class="text-center m-auto">
              <button
                type="button"
                class="btn btn-danger px-4"
                @click="hideImageDrag()"
              >
                Cancel
              </button>
            </div>
            <input
              type="file"
              id="fileElem"
              multiple
              accept="image/*"
              @change="onFilesPick"
            />
          </form>
          <div class="row" id="gallery">
            <div class="col-lg-4" v-for="image in uploadedImages" :key="image">
              <img style="width: 150px" :src="image" />
              <a href="javascript:void(0)" @click="removeFromPreview(image)">
                <span
                  class="
                    start-100
                    translate-middle
                    badge
                    border border-light
                    rounded-circle
                    bg-danger
                  "
                  >X</span
                >
              </a>
            </div>
          </div>
          <progress
            style="display: none"
            id="progress-bar"
            max="100"
            value="0"
          ></progress>
        </div>
      </div>
      <div class="wrap-chat" id="chat_body">
        <div class="loading-bar" v-if="chatListLoader">
          <div class="blue-bar"></div>
        </div>
        <div
          class="chat"
          id="chat-container"
          v-bind:class="{ opacitynone: chatListLoader }"
        >
          <div v-if="activeChatData">
            <div v-for="message in messages" :key="message._id">
              <div
                class="chat-bubble"
                v-bind:class="{
                  me: message.type === 'send',
                  you: message.type === 'receive',
                }"
              >
                <div
                  v-bind:class="{
                    'my-mouth': message.type === 'send',
                    'your-mouth': message.type === 'receive',
                  }"
                ></div>
                <div class="content">
                  <!-- Narrow the discriminated union: the call branch has `duration`, the text branch has `media`/`message`. -->
                  <span v-if="message.datatype === 'call'">
                    <span v-if="message.type === 'send'">
                      <i-bi-telephone-outbound-fill
                      />&nbsp;&nbsp; Outbound</span
                    >
                    <span v-else
                      ><i-bi-telephone-inbound-fill
                      />&nbsp;&nbsp; Inbound</span
                    >
                    Call( {{ getMMSS(message.duration ?? 0) }} )
                  </span>
                  <template v-else>
                    <span
                      v-if="
                        message.media &&
                        JSON.parse(message.media) &&
                        JSON.parse(message.media).length > 0
                      "
                    >
                      <span
                        v-for="image in JSON.parse(message.media)"
                        :key="image"
                      >
                        <a @click="showImage(image)" href="javascript:void(0)">
                          <img :src="image" alt="Image" />
                        </a>
                      </span>
                    </span>
                    <span> {{ message.message }} </span>
                  </template>
                </div>
                <div class="time">
                  {{ formatTimestamp(message.created_at) }}
                  <!-- January 1, 2000 10:00 AM -->
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="row wrap-container">
        <div class="col-md-12 wrap-container2">
          <div class="wrap-message" v-if="activeChatData">
            <div class="message pl-2">
              <input
                type="text"
                class="input-message"
                placeholder="Type message here"
                v-model="messageBody"
                v-on:keyup.enter="sendSms"
              />
              <a class="m-2" @click="file_upload()" href="javascript:void(0)">
                <i-bi-paperclip style="transform: scale(2)" />
              </a>
            </div>
            <div
              class="btn btn-primary m-2"
              @click="sendSms()"
              style="height: 36px"
            >
              <i-bi-arrow-right-circle-fill
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
    <!-- modal -->
    <b-modal
      ref="composeMsgModal"
      id="modal-2"
      size="lg"
      title="Compose Message"
      no-footer
    >
      <span class="small text-secondary"
        >Input (+) and country code followed by the 10 digit phone number. If no
        country code is provided (+1) is assumed. Multiple numbers will be sent
        as Bulk SMS (individual sms's to recipients).
        <span class="small text-center"
          >[Telnyx does not support group texting]</span
        ></span
      >
      <form @submit.prevent="handleSubmit2" class="ml-2 mr-2">
        <v-select
          class="mt-4"
          v-model="selectedContact"
          @option-selected="contactChangeEvent"
          :options="contactSelectOptions"
        ></v-select>
        <div class="form-group mt-4">
          <vue-tags-input
            class="form-control chat-input"
            v-model="r$.$value.sms.numbers"
            :tags="tags"
            placeholder="Enter phone number"
            @tags-changed="onTagsChanged"
          />
          <div v-if="tags.length <= 0" class="invalid-feedback">
            <span>Numbers are required</span>
          </div>
        </div>
        <div class="form-group mb-2 mt-4">
          <textarea
            rows="8"
            class="form-control chat-input"
            v-model="r$.$value.sms.message"
            placeholder="Type Message here"
            :class="{ 'is-invalid': submitted2 && r$.sms.message.$error }"
          >
          </textarea>
          <div
            v-if="submitted2 && r$.sms.message.$error"
            class="invalid-feedback"
          >
            <span v-for="error of r$.$errors.sms.message" :key="error">{{ error }}</span>
          </div>
        </div>
        <!-- send images over MMS -->
        <label class="input-group mb-3" for="model_file_input" style="cursor: pointer">
          <span class="input-group-text paperClip chat-input">
            <i-bi-paperclip/>
          </span>
          <span class="form-control chat-input" :class="{ 'text-secondary': !modelFileValue }">{{ modelFileValue || 'Choose file' }}</span>
        </label>
        <div class="form-group mb-2 mt-4 d-none">
          <input
            type="file"
            id="model_file_input"
            class="form-control chat-input"
            multiple
            accept="image/*"
            @change="onFilesPick($event, true)"
          />
        </div>

        <div class="d-grid d-md-flex">
          <button class="btn btn-primary" type="submit" id="login-button">
            Send Message
          </button>
        </div>
      </form>
    </b-modal>
    <div id="hidden" @click="hiddenImage()">
      <div
        class="d-flex justify-content-center align-items-center"
        style="height: 100vh; width: 100vw"
      >
        <img class="img-fluid" alt="Responsive image" :src="zoomImage" />
      </div>
    </div>
    <!-- / modal -->
  </div>
</template>

<script lang="ts">
/** Main messaging view: conversation list (NumberList), the chat thread, the compose SMS/MMS modal, and the call tab. */
import { defineComponent, useTemplateRef } from "vue";
import { useRegle } from "@regle/core";
import { required, withMessage } from "@regle/rules";
import VueTagsInput from '@sipec/vue3-tags-input'
import { Select, type SelectOptionData } from 'vue3-select-component'
import { io } from "socket.io-client";
import NumberList from "./inbox/NumberList.vue";
import LoadingSpinner from "@/components/LoadingSpinner.vue";
import ThemeButton from "@/components/ThemeButton.vue";
import CallView from "@/components/CallView.vue";
import CheckDir from "@/components/CheckDir.vue";
import type { BModal, BOffcanvas } from "bootstrap-vue-next";
import { useProfileStore } from "@/stores/profile.ts";
import { useUserStore } from "@/stores/user.ts";
import { EventBus } from "@/event-bus.ts";
import { contactsToOptions, parseJSON, formatTimestamp } from '@/helper.ts';
import { notifyError, notifyInfo } from '@/notify.ts';
import { client, request } from '@/core/rpc.client.ts'
import type { InferResponseType } from 'hono/client'
import type { SuccessStatusCode } from 'hono/utils/http-status'

type UploadResponseSuccess = InferResponseType<typeof client.api.media.uploads.$post, SuccessStatusCode>
/** The full hc `ClientResponse` the upload route returns -- carries status/format params so `request()` infers the body. */
type UploadResponse = Awaited<ReturnType<typeof client.api.media.uploads.$post>>
/** One entry in a conversation thread, inferred from the messages route. */
type ChatMessage = InferResponseType<typeof client.api.setting.conversations.messages.$post, SuccessStatusCode>['data'][number]

function preventDefaults(e: Event) {
  e.preventDefault();
  e.stopPropagation();
}

function getVw(): number {
  return Math.round(Math.max(
    document.documentElement.clientWidth ?? 0,
    window.innerWidth ?? 0
  ));
}

function getVh(): number {
  return Math.round(Math.max(
    document.documentElement.clientHeight ?? 0,
    window.innerHeight ?? 0
  ));
}

function file_upload() {
  document.getElementById("fileElem")!.click();
}

function getMMSS(time: number): string {
  const mins = ~~((time % 3600) / 60);
  const secs = ~~time % 60;

  // Output like "1:01" or "03:59"
  let ret = "";
  ret += "" + mins + ":" + (secs < 10 ? "0" : "");
  ret += "" + secs;
  return ret;
}

export default defineComponent({
  name: "DashboardView",
  components: {
    NumberList,
    LoadingSpinner,
    VueTagsInput,
    ThemeButton,
    CallView,
    CheckDir,
    'v-select': Select,
  },
  setup() {
    const { r$ } = useRegle(
      { sms: { numbers: "", message: "" } },
      {
        sms: {
          numbers: { required },
          message: { required: withMessage(required, "Message is required") },
        },
      }
    );
    const callView = useTemplateRef<InstanceType<typeof CallView>>("callView");
    const numberList = useTemplateRef<InstanceType<typeof NumberList>>("numberList");
    const mobileSidebar = useTemplateRef<InstanceType<typeof BOffcanvas>>("mobileSidebar");
    const composeMsgModal = useTemplateRef<InstanceType<typeof BModal>>("composeMsgModal");
    return {
      r$,
      profileStore: useProfileStore(),
      userStore: useUserStore(),
      callView,
      numberList,
      mobileSidebar,
      composeMsgModal
    };
  },
  data() {
    return {
      isLoading: false,
      contacts: [] as any[],
      selectedContact: "",
      dropArea: null as any,
      progressBar: null as any,
      uploadProgress: [] as number[], // numbers from 0 to 100
      uploadedImages: [] as string[],
      activeChatData: false,
      activeProfile: null as any,
      // activeChat is a synthesized conversation object from the listConversations aggregate (GET setting/conversations),
      // which runs over the SMS Message model (app/model/message.model.ts)
      activeChat: "" as any,
      tags: [] as any[],
      chatListLoader: false,
      submitted2: false,
      messages: [] as ChatMessage[],
      messageBody: "",
      socket: null as any,
      baseurl: "",
      vw: 0,
      vh: 0,
      modelMms: false,
      modelFileValue: "",
      zoomImage: "",
      activeCallTab: false,
    };
  },
  computed: {
    contactSelectOptions(): SelectOptionData<string>[] {
      return contactsToOptions(this.contacts);
    },
  },
  watch: {
    // Active profile changed (selection or settings update): reset the open chat
    // and re-mount the call tab. Was the `changeProfile`/`changeProfile2` events.
    "profileStore.activeProfile"() {
      // unselect any active message thread
      this.activeChat = null;
      // forces Vue to destroy and recreate <call-view> so the calling SDK re-initializes against the newly-selected profile
      this.activeCallTab = false;
      setTimeout(() => {
        this.activeCallTab = true;
      }, 1500);
    },
  },
  created() {
    window.addEventListener("resize", this.updateVw, { passive: true });
  },
  unmounted() {
    window.removeEventListener("resize", this.updateVw);
  },
  mounted() {
    EventBus.$on("contactAdded", (number: any) => {
      if (this.activeChat._id === number) {
        this.showChat(this.activeChat);
      }
    });
    if (!this.userStore.isLoggedIn) {
      this.$router.push({ name: 'home' });
    }
    this.updateVw();
    const baseUrl = window.location.origin;
    if (baseUrl === "http://localhost:8080") {
      this.baseurl = "http://localhost:3000";
    }
    const socket = io(this.baseurl, { transports: ["websocket"] });
    this.socket = socket;
    this.socket.on("new_message", () => {
      this.numberList?.getNumberList();
      if (this.activeChatData) {
        this.showChat(this.activeChat);
      }
    });
    this.socket.emit("join_profile_channel", this.userStore.userData?._id.toString());

    this.socket.on("user_message", (data: any) => {
      if (this.activeChatData) {
        this.showChat(this.activeChat);
      } else {
        this.numberList?.getOneProfile();
        this.numberList?.refreshProfile();
      }
      this.numberList?.getNumberList();
      this.notifyMe(data.number, data.message);
    });
    this.dropArea = document.getElementById("drop-area1");
    ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
      this.dropArea.addEventListener(eventName, preventDefaults, false);
    });
    ["dragenter", "dragover"].forEach((eventName) => {
      this.dropArea.addEventListener(eventName, this.highlight.bind(this), false);
    });
    ["dragleave", "drop"].forEach((eventName) => {
      this.dropArea.addEventListener(eventName, this.unhighlight.bind(this), false);
    });
    this.dropArea.addEventListener("drop", this.handleDrop.bind(this), false);
    this.progressBar = document.getElementById("progress-bar");
  },
  methods: {
    formatTimestamp,
    addContact(number: any) {
      EventBus.$emit("addContact", number);
    },
    onTagsChanged(newTags: any[]) {
      this.tags = newTags;
    },
    makeCall() {
      if (this.activeChat) {
        this.callView?.makeCall(this.activeChat._id);
      }
    },
    contactChangeEvent(option: SelectOptionData<string>) {
      this.tags.push({ text: option.value, tiClasses: ["ti-valid"] });
      this.selectedContact = "";
    },
    onaddContact(data: any) {
      this.contacts = data;
    },
    hiddenImage() {
      this.zoomImage = "";
      document.getElementById("hidden")!.style.display = "none";
    },
    showImage(image: any) {
      this.zoomImage = image;
      document.getElementById("hidden")!.style.display = "block";
    },
    file_upload,
    initializeProgress(numfiles: number) {
      this.progressBar.value = 0;
      this.uploadProgress = Array.from({ length: numfiles }, () => 0);
    },
    updateProgress(fileNumber: number, percent: number) {
      this.uploadProgress[fileNumber] = percent;
      // this is incorrect because it averages percentages, when will be wrong when there are some small and some big files. need to track bytes and totals separately
      const total = this.uploadProgress.reduce((tot, curr) => tot + curr, 0) / this.uploadProgress.length;
      this.progressBar.value = total;
    },
    handleDrop(e: DragEvent) {
      const dt = e.dataTransfer;
      if (!dt) throw new Error('DataTransfer should never be null when dispatched by browser')
      this.handleFiles(dt.files);
    },
    onFilesPick(e: Event, modelFile = false) {
      // todo: consider using v-model instead of change events: https://vuejs.org/guide/essentials/forms.html
      const target = e.target as HTMLInputElement
      // target.files will always be non-null, there is no way for to unselect files in a way that fires a change event.
      // even if in code, we set `target.value = null`, it will not fire a change event
      if (!target.files) return
      this.handleFiles(target.files, modelFile);
    },
    handleFiles(fileList: FileList, modelFile = false) {
      // turn fileList into a normal array so we can .map/.forEach on it, but try to keep it readonly like FileList intended
      const files = Object.freeze([...fileList])
      if (modelFile) {
        this.modelMms = true;
        this.modelFileValue = files.map(f => f.name).join()
      } else {
        this.modelMms = false;
      }
      this.initializeProgress(files.length);
      const prog = (i: number) => (loaded: number, total: number) => { this.updateProgress(i, total > 0 ? (loaded * 100) / total : 100) } // fallback to 100% 
      // forEach does not await and ignores its callback, promises will be queued (not awaited) and this function returned immediately
      files.forEach(async (f, i) => {
        const res = await this.uploadFile(f, prog(i))
        this.uploadedImages.push(res.data.media)
      })
    },
    removeFromPreview(image: any) {
      this.uploadedImages = this.uploadedImages.filter((img) => img !== image);
      if (this.uploadedImages.length <= 0) {
        document.getElementById("drop-area")!.style.display = "none";
      }
    },
    async uploadFile(file: File, onProgress: (loaded: number, total: number) => void): Promise<UploadResponseSuccess> {
      // todo: this can be extracted out of the view layer
      // fetch has no upload-progress event, so we stream the file body and count bytes as they pass through a
      // TransformStream. A streamed request body needs `duplex: 'half'` and request-stream support (Chromium only --
      // Safari/Firefox don't stream uploads), so this is intentionally not cross-browser.
      // `$url()` gives the route's absolute URL from the client's origin (see test/rpc-url.test.ts)
      // We hit it directly because hc's `$post` buffers a FormData body with no way to observe progress.
      // The server derives the stored file type from the `Content-Type` header (no client filename trusted).
      const total = file.size;
      let loaded = 0;
      const progress = new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
          loaded += chunk.byteLength;
          onProgress(loaded, total);
          controller.enqueue(chunk);
        }
      });
      const init: RequestInit & { duplex: 'half' } = {
        method: 'POST',
        headers: { token: this.userStore.token, 'Content-Type': file.type },
        body: file.stream().pipeThrough(progress),
        duplex: 'half'
      };
      // Route the manual Response through `request()` so failures hit the same central toast/parse path as every hc
      // call (parseResponse runs on a plain fetch Response too); the cast supplies the inferred success-body type.
      return request(fetch(client.api.media.uploads.$url(), init) as unknown as Promise<UploadResponse>);
    },
    highlight() {
      document.getElementById("drop-area")!.style.display = "block";
      this.dropArea.classList.add("highlight");
    },
    unhighlight() {
      this.dropArea.classList.remove("highlight");
    },
    activeProfileView(profile: any) {
      if (profile.refresh) {
        this.messages = [];
      }
      this.activeProfile = profile;
    },
    onClickChild(value: any) {
      this.firstChatShow(value);
    },
    async notifyMe(user: any, message: any) {
      const msgIcon = new URL('@/assets/img/icon.png', import.meta.url).href;
      if (!("Notification" in window)) {
        alert("This browser does not support desktop notification");
      } else if (Notification.permission === "granted") {
        const options = {
          body: message,
          dir: "auto" as const,
          icon: msgIcon,
        };
        new Notification("Message from " + user, options);
      } else if (Notification.permission !== "denied") {
        const permission = await Notification.requestPermission()
        if (!("permission" in Notification)) {
          (Notification as any).permission = permission;
        }
        if (permission === "granted") {
          const options = {
            body: message,
            dir: "auto",
            icon: msgIcon,
          } as const
          new Notification("Message from " + user, options);
        }
      }
    },
    async deleteChat() {
      const result = await this.$swal.fire({
        icon: "info",
        title: "Do you want to delete this chat?",
        showDenyButton: true,
        showCancelButton: false,
        confirmButtonText: "Yes, Delete",
        denyButtonText: "No",
      });
      if (result.isDenied) {
        notifyInfo("chat not deleted");
        return;
      }
      if (!result.isConfirmed) return;

      await request(client.api.setting.conversations[':number'].$delete({
        param: { number: this.activeChat._id },
      }));
      if (this.activeChatData) this.showChat(this.activeChat);
      this.numberList?.getNumberList();
    },
    sendSms() {
      this.isLoading = true;
      if (this.messageBody.trim() === "" && this.uploadedImages.length === 0) {
        notifyError("Message or file required", "Oops...");
        this.isLoading = false;
        return;
      }
      const activechat = parseJSON(localStorage.getItem("activenumber"));
      const numbers = [activechat._id];
      this.commonSendMessage(numbers, this.messageBody);
    },
    hideImageDrag() {
      this.uploadedImages = [];
      document.getElementById("drop-area")!.style.display = "none";
    },
    async commonSendMessage(numbers: string[], message: string) {
      try {
        await request(client.api.setting.messages.$post({
          json: { numbers, message, media: this.uploadedImages, profile: { _id: this.activeProfile._id } },
        }));
        this.messageBody = "";
        this.r$.$value.sms.numbers = "";
        this.r$.$value.sms.message = "";
        this.uploadedImages = [];
        this.modelFileValue = "";
        document.getElementById("drop-area")!.style.display = "none";
        this.tags = [];
        this.numberList?.getNumberList();
        if (this.activeChatData) {
          this.showChat(this.activeChat);
        }
        this.composeMsgModal?.hide();
        if (this.vw < 576) {
          this.mobileSidebar?.hide();
        }
      } finally {
        this.isLoading = false;
      }
    },
    firstChatShow(activechat: any) {
      this.chatListLoader = true;
      const element = document.getElementById(activechat._id);
      if (element) {
        element.remove();
      }
      this.showChat(activechat);
      document.getElementById("drop-area")!.style.display = "none";
      this.uploadedImages = [];
      if (this.vw < 576) {
        this.mobileSidebar?.hide();
      }
    },
    async showChat(activechat: any) {
      // todo: type activechat so payload / validator types can be strict
      this.activeChat = activechat;
      this.activeChatData = true;
      const { telnyx_number, _id } = activechat;
      const { data } = await request(client.api.setting.conversations.messages.$post({
        json: { number: { telnyx_number, _id }, profile: this.activeProfile._id },
      }));
      this.messages = data;
      setTimeout(() => {
        const scroll = document.getElementById("chat-container")!;
        scroll.scrollTop = scroll.scrollHeight;
        scroll.animate({ scrollTop: scroll.scrollHeight });
        this.chatListLoader = false;
      }, 1000);
      this.numberList?.refreshProfile();
      this.numberList?.getOneProfile();
    },
    async handleSubmit2() {
      this.submitted2 = true;
      // todo: validation in this is odd
      await this.r$.$validate();

      this.isLoading = true;
      if (this.tags.length <= 0) {
        notifyError("please enter number!", "Oops...");
        return;
      }
      const numbers = this.tags.map(({ text }) => text)

      if (!this.r$.sms.message.$error || this.uploadedImages.length > 0) {
        this.commonSendMessage(numbers, this.r$.$value.sms.message);
      } else {
        notifyError("Message or file required!", "Oops...");
        this.isLoading = false;
      }
    },
    updateVw() {
      this.vw = getVw();
      this.vh = getVh();
      const chatHeight = this.vh - 120;
      document.getElementById("wrapbody")!.style.height = `${this.vh}px`;
      document.getElementById("chat_body")!.style.height = `${chatHeight}px`;
    },
    getMMSS,
  },
});
</script>

<style scoped>
.opacitynone {
  opacity: 0;
}
.activeImageArea {
  display: block !important;
}
.icons {
  font-size: 30px;
}
.chat_loader {
  width: 100%;
  max-width: 100%;
}

#drop-area {
  border: 2px dashed #ccc;
  border-radius: 20px;
  height: 75vh;
  font-family: sans-serif;
  padding: 20px;
  position: absolute;
  top: 100px;
  background: black;
  display: none;
}
#drop-area.highlight {
  border-color: purple;
}
p {
  margin-top: 0;
}
.my-form {
  margin-bottom: 10px;
}
#gallery {
  margin-top: 10px;
}

.button {
  display: inline-block;
  padding: 10px;
  background: #ccc;
  cursor: pointer;
  border-radius: 5px;
  border: 1px solid #ccc;
}
.button:hover {
  background: #ddd;
}
#fileElem {
  display: none;
}
.paperClip {
  border-radius: 0% !important;
  border-top-left-radius: 5px !important;
  border-bottom-left-radius: 5px !important;
  padding: 0.5rem 0.75rem !important;
  border-right: 1px solid black;
}
#hidden {
  z-index: 9999;
  display: none;
  position: fixed;
  height: 100%;
  width: 100%;
  left: 0px;
  top: 0px;
  text-align: center;
}

</style>
