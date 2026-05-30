<template>
  <div v-if="idHide === 'false'">
    <input
      @change="toggleTheme"
      id="checkbox"
      type="checkbox"
      class="switch-checkbox"
    />
    <label for="checkbox" class="switch-label switch-label-mode">
      <span>🌙</span>
      <span>☀️</span>
      <div
        class="switch-toggle"
        :class="{ 'switch-toggle-checked': userTheme === 'dark-theme' }"
      ></div>
    </label>
  </div>
</template>

<script>
export default {
  props: ['idHide'],
  mounted () {
    this.setTheme(localStorage.getItem('user-theme') ?? this.getMediaPreference())
  },

  data () {
    return {
      userTheme: 'light-theme'
    }
  },

  methods: {
    toggleTheme () {
      const activeTheme = localStorage.getItem('user-theme')
      this.setTheme(activeTheme === 'light-theme' ? 'dark-theme' : 'light-theme')
    },

    setTheme (theme) {
      localStorage.setItem('user-theme', theme)
      this.userTheme = theme
      document.documentElement.className = theme
    },

    getMediaPreference () {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark-theme' : 'light-theme'
    }
  }
}
</script>

<style scoped>
.switch-checkbox {
  display: none;
}

.switch-label {
  align-items: center;
  background: var(--text-primary-color);
  border: calc(var(--element-size) * 0.025) solid var(--accent-color);
  border-radius: var(--element-size);
  cursor: pointer;
  display: flex;
  font-size: calc(var(--element-size) * 0.3);
  height: calc(var(--element-size) * 0.35);
  position: relative;
  padding: calc(var(--element-size) * 0.1);
  transition: background 0.5s ease;
  justify-content: space-between;
  width: var(--element-size);
  z-index: 1;
}

.switch-toggle {
  position: absolute;
  background-color: var(--background-color-primary);
  border-radius: 50%;
  top: calc(var(--element-size) * 0.07);
  left: calc(var(--element-size) * 0.07);
  height: calc(var(--element-size) * 0.4);
  width: calc(var(--element-size) * 0.4);
  transform: translateX(0);
  transition: transform 0.3s ease, background-color 0.5s ease;
}

.switch-toggle-checked {
  transform: translateX(calc(var(--element-size) * 0.6)) !important;
}
</style>
