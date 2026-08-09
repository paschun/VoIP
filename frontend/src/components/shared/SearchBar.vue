<template>
  <div class="search-bar">
    <div class="search-box">
      <IBiSearch aria-hidden="true" />
      <input v-model="query" type="text" class="search-input" placeholder="Search">
    </div>
  </div>
</template>

<script setup lang="ts">
/** Rounded search field heading a list panel; `v-model` is the query string. */
const query = defineModel<string>({ required: true })
</script>

<style scoped>
.search-bar {
  width: 100%;
  height: 45px;
  background: var(--background-color-primary);
  display: flex;
}
.search-box {
  width: calc(100% - 20px);
  height: 30px;
  background-color: var(--background-color-secondary);
  margin: auto;
  border-radius: 15px;
  display: flex;
}
.search-box svg {
  flex: none;
  margin: auto 0.75rem;
  color: #aaaaaa;
}
.search-input {
  width: 100%;
  border: none;
  background-color: var(--background-color-secondary);
  color: var(--text-primary-color);
  border-radius: unset; /* fixes Chromium cursor size on message search bar */
}
.search-input:focus {
  outline: none;
}
</style>
