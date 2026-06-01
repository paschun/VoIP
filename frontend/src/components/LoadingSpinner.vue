<template>
  <Teleport to="body">
    <Transition name="loading-fade">
      <div v-if="show" class="app-loader">
        <div class="d-flex loader justify-content-center align-items-center">
          <div class="sp sp-circle"></div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

// Translucent full-viewport overlay with a centered spinner, toggled via `show`.
// Always teleports to `body` so it escapes any transformed ancestor, or getting clipped off with `overflow`
// e.g. a floating `b-dropdown` menu, where floating-ui's has `transform`
// A transformed ancestor becomes the containing block for position: fixed
export default defineComponent({
  name: 'LoadingSpinner',
  props: {
    show: { type: Boolean, default: false }
  }
})
</script>

<style scoped>
.app-loader {
  /* fixed (not absolute): scrolls with us */
  position: fixed;
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
.sp {
  width: 32px;
  height: 32px;
  clear: both;
  margin: 20px auto;
}
.sp-circle {
  border: 4px rgba(0, 0, 0, 0.25) solid;
  border-top: 4px black solid;
  border-radius: 50%;
  animation: spCircRot 0.6s infinite linear;
}
@keyframes spCircRot {
  from { transform: rotate(0deg); }
  to { transform: rotate(359deg); }
}

/* Fade the overlay in/out (see Vue's Teleport modal example). */
.loading-fade-enter-active,
.loading-fade-leave-active {
  transition: opacity 0.1s ease;
}
.loading-fade-enter-from,
.loading-fade-leave-to {
  opacity: 0;
}
</style>
