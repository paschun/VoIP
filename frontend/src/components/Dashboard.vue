<template>
  <div class="wrap">
    <call-view
      ref="callView"
    ></call-view>
    <loading-spinner :show="isSendingMsg" />
    <theme-button id-hide="true"></theme-button>
    <!--
      Responsive offcanvas: below the `sm` breakpoint it's a slide-out drawer (opened by the chat-head
      hamburger via v-b-toggle.sidebar-no-header); at/above `sm` Bootstrap renders it inline as the static
      sidebar column
    -->
    <b-offcanvas
      id="sidebar-no-header"
      ref="mobileSidebar"
      class="col-auto col-md-4"
      responsive="sm"
      placement="start"
      no-header
      shadow
    >
      <template #default="{ hide }">
        <!-- .d-sm-none hides this row >= sm breakpoint -->
        <div class="d-flex flex-row-reverse bd-highlight d-sm-none">
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
    <section
      class="col col-md-8 pb-2"
      @dragenter.prevent.stop="highlight"
      @dragover.prevent.stop="highlight"
      @dragleave.prevent.stop="unhighlight"
      @drop.prevent.stop="handleDrop"
    >
      <div class="chat-head">
        <!-- hamburger / drawer-open icon hidden on larger screens (>= sm) where sidebar always visible -->
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
          <span style="cursor: pointer" @click="makeCall()" title="Call">
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
          v-show="isDragging || uploadedImages.length"
          :class="{ highlight: isDragging }"
        >
          <form class="upload-form">
            <p class="mt-0">
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
              class="d-none"
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
            v-show="isUploading"
            class="w-100"
            max="100"
            :value="uploadProgressValue"
          ></progress>
        </div>
      </div>
      <div class="wrap-chat">
        <div class="loading-bar" v-if="chatListLoader">
          <div class="blue-bar"></div>
        </div>
        <div
          ref="chatContainer"
          class="chat"
          :class="{ 'opacity-0': chatListLoader }"
        >
          <div v-if="conversationStore.hasActiveConversation">
            <div v-for="message in conversationStore.messages" :key="message._id">
              <div
                class="chat-bubble"
                :class="{
                  me: message.type === 'send',
                  you: message.type === 'receive',
                }"
              >
                <div
                  :class="{
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
                @keyup.enter="sendSms"
              />
              <label class="m-2" for="fileElem" style="cursor: pointer">
                <i-bi-paperclip style="transform: scale(2)" />
              </label>
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
    <div id="image-zoom-overlay" v-show="zoomImage" @click="hideImage()">
      <div
        class="d-flex justify-content-center align-items-center"
        style="height: 100vh; width: 100vw"
      >
        <img class="img-fluid" alt="Responsive image" :src="zoomImage" />
      </div>
    </div>
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

import type { BOffcanvas } from "bootstrap-vue-next";
import { useProfileStore } from "@/stores/profile.ts";
import { useUserStore } from "@/stores/user.ts";
import { useConversationStore, type Conversation } from "@/stores/conversation.ts";
import { formatTimestamp } from '@/helper.ts';
import { appDirectory } from '@/router/helpers.ts';
import { uploadMedia } from '@/core/services/media.ts';
import { notifyError, notifyInfo } from '@/notify.ts';

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
  },
  setup() {
    const callView = useTemplateRef<InstanceType<typeof CallView>>("callView");
    const numberList = useTemplateRef<InstanceType<typeof NumberList>>("numberList");
    const mobileSidebar = useTemplateRef<InstanceType<typeof BOffcanvas>>("mobileSidebar");
    const chatContainer = useTemplateRef<HTMLDivElement>("chatContainer");
    return {
      profileStore: useProfileStore(),
      userStore: useUserStore(),
      conversationStore: useConversationStore(),
      callView,
      numberList,
      mobileSidebar,
      chatContainer,
    };
  },
  data(): {
    isSendingMsg: boolean;
    isDragging: boolean;
    isUploading: boolean;
    uploadProgress: number[]; // numbers from 0 to 100
    uploadedImages: string[];
    chatListLoader: boolean;
    messageBody: string;
    socket: Socket | null;
    baseurl: string;
    zoomImage: string;
  } {
    return {
      isSendingMsg: false,
      isDragging: false,
      isUploading: false,
      uploadProgress: [],
      uploadedImages: [],
      chatListLoader: false,
      messageBody: "",
      socket: null,
      baseurl: "",
      zoomImage: "",
    };
  },
  mounted() {
    if (!this.userStore.isLoggedIn) {
      // Bounce to the login page inside the current directory -- never bare `/`, which the server gate 404s.
      this.$router.push({ name: 'login', params: { appdirectory: appDirectory(this.$route) } });
    }
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
  },
  computed: {
    /** Averaging percentages is wrong with mixed file sizes; tracking loaded/total bytes would be accurate. */
    uploadProgressValue(): number {
      if (this.uploadProgress.length === 0) return 0;
      return this.uploadProgress.reduce((tot, curr) => tot + curr, 0) / this.uploadProgress.length;
    },
  },
  methods: {
    formatTimestamp,
    addContact(phoneNumber: string) {
      this.numberList?.openAddContact(phoneNumber);
    },
    /** A compose-modal send may have created the first thread for a number; drop the mobile sidebar to reveal it. */
    onMessageSent() {
      this.mobileSidebar?.hide();
    },
    makeCall() {
      if (this.conversationStore.hasActiveConversation) {
        this.callView?.makeCall(this.conversationStore.activeRemoteNumber);
      }
    },
    hideImage() {
      this.zoomImage = "";
    },
    showImage(image: string) {
      this.zoomImage = image;
    },
    initializeProgress(numfiles: number) {
      this.uploadProgress = Array.from({ length: numfiles }, () => 0);
    },
    updateProgress(fileNumber: number, percent: number) {
      this.uploadProgress[fileNumber] = percent;
    },
    handleDrop(e: DragEvent) {
      this.isDragging = false;
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
    async uploadFiles(fileList: FileList) {
      // turn fileList into a normal array so we can .map/.forEach on it, but try to keep it readonly like FileList intended
      const files = Object.freeze([...fileList])
      this.initializeProgress(files.length);
      this.isUploading = true;
      const prog = (i: number) => (loaded: number, total: number) => { this.updateProgress(i, total > 0 ? (loaded * 100) / total : 100) } // fallback to 100%
      try {
        await Promise.all(files.map(async (f, i) => {
          const res = await uploadMedia(f, this.userStore.token, prog(i))
          this.uploadedImages.push(res.data.media)
        }))
      } finally {
        this.isUploading = false;
      }
    },
    removeFromPreview(image: string) {
      this.uploadedImages = this.uploadedImages.filter((img) => img !== image);
    },
    highlight() {
      this.isDragging = true;
    },
    unhighlight() {
      this.isDragging = false;
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
      this.isSendingMsg = true;
      try {
        await this.conversationStore.sendMessage({
          numbers: [this.conversationStore.activeRemoteNumber],
          message: this.messageBody,
          media: this.uploadedImages,
        });
        this.messageBody = "";
        this.uploadedImages = [];
        this.mobileSidebar?.hide();
      } finally {
        this.isSendingMsg = false;
      }
    },
    hideImageDrag() {
      this.uploadedImages = [];
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
      this.mobileSidebar?.hide();
    },
    scrollChatToBottom() {
      const scroll = this.chatContainer;
      if (!scroll) return;
      scroll.scrollTop = scroll.scrollHeight;
    },
    resetComposer() {
      this.uploadedImages = [];
    },
    getMMSS,
  },
});
</script>

<style scoped>
#drop-area {
  border: 2px dashed #ccc;
  border-radius: 20px;
  height: 75vh;
  font-family: sans-serif;
  padding: 20px;
  position: absolute;
  top: 100px;
  background: black;
}
#drop-area.highlight {
  border-color: purple;
}
.upload-form {
  margin-bottom: 10px;
}
#gallery {
  margin-top: 10px;
}

#image-zoom-overlay {
  z-index: 9999;
  position: fixed;
  height: 100%;
  width: 100%;
  left: 0px;
  top: 0px;
  text-align: center;
  background-color: var(--background-color-secondary) !important;
}

/* Outer app container */
.wrap {
  display: flex;
  flex-grow: 1;
  height: 100dvh;
  max-width: 1200px;
  border-radius: 10px;
  overflow: hidden;
  margin: auto;
  box-shadow: 0px 0px 2px 0px #aaa;
}
@media only screen and (max-width: 768px) {
  .wrap {
    margin-bottom: auto !important;
  }
}

/* ------ RIGHT SIDE ------ */
.chat-head {
  background-color: var(--background-color-secondary);
  width: 100%;
  height: 60px;
  display: flex;
  padding-right: 25px;
}
.chat-head i {
  color: #aaaaaa;
  width: 60px;
  margin: auto;
  text-align: center;
}
.chat-name {
  width: 100%;
  margin: auto;
}
.wrap-chat {
  height: calc(100dvh - 120px);
  display: flex;
}

/* ------ CHAT ------ */
.chat-bubble {
  border-radius: 7px;
  box-shadow: 2px 2px 10px rgba(70, 70, 70, 0.5);
  padding: 5px 7px;
  width: 350px;
  max-width: 100%;
  position: relative;
}
.your-mouth {
  width: 0;
  height: 0;
  border-bottom: 10px solid var(--chat-you);
  border-left: 10px solid transparent;
  position: absolute;
  bottom: 10px;
  left: -10px;
}
.my-mouth {
  width: 0;
  height: 0;
  border-bottom: 10px solid var(--chat-me);
  border-right: 10px solid transparent;
  position: absolute;
  bottom: 10px;
  left: 100%;
}
.wrap-message {
  width: auto;
  height: 60px;
  background: var(--chat-background);
  display: flex;
}
.input-message {
  width: 100%;
  margin: 0px 10px;
  border: none;
  background: var(--chat-you);
  color: var(--text-primary-color) !important;
  padding: 5px;
  border-radius: 25px;
  padding-left: 15px;
}
.input-message:focus {
  outline: none;
}

/* ------ CHAT: thread loading bar ------ */
.loading-bar {
  width: 50%;
  height: 2px;
  margin-left: -15%;
  border-radius: 2px;
  background-color: var(--chat-you);
  position: relative;
  top: 50%;
  left: 50%;
  overflow: hidden;
  z-index: 5;
  transform: rotateY(0);
  transition: transform 0.3s ease-in;
}
.loading-bar .blue-bar {
  height: 100%;
  width: 68px;
  position: absolute;
  transform: translate(-34px);
  background-color: var(--theme-orange);
  border-radius: 2px;
  animation: initial-loading 1.5s ease infinite;
}
@keyframes initial-loading {
  0% {
    transform: translate(-34px);
  }
  50% {
    transform: translate(96px);
  }
  to {
    transform: translate(-34px);
  }
}
</style>
