<template>
  <div id="wrapbody" class="wrap">
    <check-dir />
    <call-view
      ref="callView"
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
          @conversationSelected="firstChatShow"
          @messageSent="onMessageSent"
        />
      </template>
    </b-offcanvas>
    <section class="col-auto col-md-4 d-none d-sm-block">
      <number-list
        ref="numberList"
        @conversationSelected="firstChatShow"
        @messageSent="onMessageSent"
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
          <h1 class="font-name" v-if="conversationStore.activeConversation">
            <div
              class="d-flex align-items-start align-self-center"
              v-if="conversationStore.activeConversation.contact"
            >
              <div class="mt-2 ml-4">
                {{ conversationStore.activeConversation.contact.first_name }}
                {{ conversationStore.activeConversation.contact.last_name }}
              </div>
            </div>
            <div class="d-flex align-items-start align-self-center">
              <div class="mt-2 ml-4">{{ conversationStore.activeRemoteNumber }}</div>
              &nbsp;&nbsp;&nbsp;
              <span
                style="cursor: copy"
                title="Add Contact"
                @click="addContact(conversationStore.activeRemoteNumber)"
                v-if="!conversationStore.activeConversation.contact"
              >
                <i-bi-plus-circle
                  aria-hidden="true"
                  style="font-size: 1.5em"
                />
              </span>
            </div>
          </h1>
        </div>
        <div class="d-flex m-auto" v-if="conversationStore.hasActiveConversation">
          <span style="cursor: pointer" @click="makeCall()" title="Delete">
            <i-bi-telephone aria-hidden="true" style="font-size: 2em" />
          </span>
          &nbsp;&nbsp;&nbsp;
          <span style="cursor: pointer" @click="deleteChat()" title="Delete">
            <i-bi-trash aria-hidden="true" style="font-size: 2em" />
          </span>
        </div>
      </div>
      <div :class="!conversationStore.activeConversation ? 'd-none' : ''">
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
          <div v-if="conversationStore.hasActiveConversation">
            <div v-for="message in conversationStore.messages" :key="message._id">
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
                    <span v-for="image in message.media" :key="image">
                      <a @click="showImage(image)" href="javascript:void(0)">
                        <img :src="image" alt="Image" />
                      </a>
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
          <div class="wrap-message" v-if="conversationStore.hasActiveConversation">
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
import { io, type Socket } from "socket.io-client";
import NumberList from "./inbox/NumberList.vue";
import LoadingSpinner from "@/components/LoadingSpinner.vue";
import ThemeButton from "@/components/ThemeButton.vue";
import CallView from "@/components/CallView.vue";
import CheckDir from "@/components/CheckDir.vue";
import type { BOffcanvas } from "bootstrap-vue-next";
import { useProfileStore } from "@/stores/profile.ts";
import { useUserStore } from "@/stores/user.ts";
import { useConversationStore, type Conversation } from "@/stores/conversation.ts";
import { formatTimestamp } from '@/helper.ts';
import { uploadMedia } from '@/core/services/media.ts';
import { notifyError, notifyInfo } from '@/notify.ts';

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
    ThemeButton,
    CallView,
    CheckDir,
  },
  setup() {
    const callView = useTemplateRef<InstanceType<typeof CallView>>("callView");
    const numberList = useTemplateRef<InstanceType<typeof NumberList>>("numberList");
    const mobileSidebar = useTemplateRef<InstanceType<typeof BOffcanvas>>("mobileSidebar");
    return {
      profileStore: useProfileStore(),
      userStore: useUserStore(),
      conversationStore: useConversationStore(),
      callView,
      numberList,
      mobileSidebar
    };
  },
  data() {
    return {
      isLoading: false,
      dropArea: null as any,
      progressBar: null as any, // progressBar is always `display: none`
      uploadProgress: [] as number[], // numbers from 0 to 100
      uploadedImages: [] as string[],
      chatListLoader: false,
      messageBody: "",
      socket: null as Socket | null,
      baseurl: "",
      vw: 0,
      vh: 0,
      zoomImage: "",
    };
  },
  created() {
    window.addEventListener("resize", this.updateVw, { passive: true });
  },
  unmounted() {
    window.removeEventListener("resize", this.updateVw);
  },
  mounted() {
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
    socket.on("new_message", () => {
      void this.conversationStore.loadConversations();
      void this.conversationStore.refreshMessages();
    });
    socket.emit("join_profile_channel", this.userStore.userData?._id.toString());

    socket.on("user_message", (data: { number: string; message: string }) => {
      if (this.conversationStore.hasActiveConversation) {
        void this.conversationStore.refreshMessages();
      } else {
        void this.profileStore.refreshActiveProfile();
        this.numberList?.refreshProfile();
      }
      void this.conversationStore.loadConversations();
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
    addContact(phoneNumber: string) {
      this.numberList?.openAddContact(phoneNumber);
    },
    /** A compose-modal send may have created the first thread for a number; on mobile drop the sidebar to reveal it. */
    onMessageSent() {
      if (this.vw < 576) {
        this.mobileSidebar?.hide();
      }
    },
    makeCall() {
      if (!this.conversationStore.hasActiveConversation) {
        this.callView?.makeCall(this.conversationStore.activeRemoteNumber);
      }
    },
    hiddenImage() {
      this.zoomImage = "";
      document.getElementById("hidden")!.style.display = "none";
    },
    showImage(image: string) {
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
      this.uploadFiles(dt.files);
    },
    onFilesPick(e: Event) {
      // todo: consider using v-model instead of change events: https://vuejs.org/guide/essentials/forms.html
      const target = e.target as HTMLInputElement
      // target.files will always be non-null, there is no way for to unselect files in a way that fires a change event.
      // even if in code, we set `target.value = null`, it will not fire a change event
      if (!target.files) return
      this.uploadFiles(target.files);
    },
    uploadFiles(fileList: FileList) {
      // turn fileList into a normal array so we can .map/.forEach on it, but try to keep it readonly like FileList intended
      const files = Object.freeze([...fileList])
      this.initializeProgress(files.length);
      const prog = (i: number) => (loaded: number, total: number) => { this.updateProgress(i, total > 0 ? (loaded * 100) / total : 100) } // fallback to 100%
      // forEach does not await and ignores its callback, promises will be queued (not awaited) and this function returned immediately
      files.forEach(async (f, i) => {
        const res = await uploadMedia(f, this.userStore.token, prog(i))
        this.uploadedImages.push(res.data.media)
      })
    },
    removeFromPreview(image: string) {
      this.uploadedImages = this.uploadedImages.filter((img) => img !== image);
      if (this.uploadedImages.length <= 0) {
        document.getElementById("drop-area")!.style.display = "none";
      }
    },
    highlight() {
      document.getElementById("drop-area")!.style.display = "block";
      this.dropArea.classList.add("highlight");
    },
    unhighlight() {
      this.dropArea.classList.remove("highlight");
    },
    async notifyMe(user: string, message: string) {
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

      await this.conversationStore.deleteActiveConversation();
    },
    async sendSms() {
      if (this.messageBody.trim() === "" && this.uploadedImages.length === 0) {
        notifyError("Message or file required", "Oops...");
        return;
      }
      if (!this.conversationStore.hasActiveConversation) return;
      this.isLoading = true;
      try {
        await this.conversationStore.sendMessage({
          numbers: [this.conversationStore.activeRemoteNumber],
          message: this.messageBody,
          media: this.uploadedImages,
        });
        this.messageBody = "";
        this.uploadedImages = [];
        document.getElementById("drop-area")!.style.display = "none";
        if (this.vw < 576) {
          this.mobileSidebar?.hide();
        }
      } finally {
        this.isLoading = false;
      }
    },
    hideImageDrag() {
      this.uploadedImages = [];
      document.getElementById("drop-area")!.style.display = "none";
    },
    async firstChatShow(conversation: Conversation) {
      this.chatListLoader = true;
      try {
        await this.conversationStore.openConversation(conversation);
        // Scroll only after Vue has flushed the new messages into the DOM; before nextTick the
        // thread isn't rendered yet, so chat-container's scrollHeight is stale and we'd land mid-thread.
        await this.$nextTick();
        this.scrollChatToBottom();
      } finally {
        this.chatListLoader = false;
      }
      this.resetComposer();
      this.numberList?.refreshProfile();
      if (this.vw < 576) {
        this.mobileSidebar?.hide();
      }
    },
    scrollChatToBottom() {
      const scroll = document.getElementById("chat-container");
      if (!scroll) return;
      scroll.scrollTop = scroll.scrollHeight;
    },
    resetComposer() {
      document.getElementById("drop-area")!.style.display = "none";
      this.uploadedImages = [];
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
