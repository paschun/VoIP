<template>
  <div>
    <div class="d-flex justify-content-between">
      <div class="p-2 bd-highlight"><component :is="titleTag">{{ title }}</component></div>
      <div class="p-2 bd-highlight">
        <b-icon
          icon="arrow-left"
          style="cursor: pointer"
          :font-scale="iconScale"
          aria-hidden="true"
          @click="$emit('back')"
        ></b-icon>
      </div>
    </div>
    <slot />
  </div>
</template>

<script>
/**
 * Standard "section header with back arrow" layout used by the settings
 * sidebars. Slot is the section body.
 */
export default {
  name: 'SettingsSection',
  props: {
    title: { type: String, required: true },
    titleTag: { type: String, default: 'h4' },
    iconScale: { type: [String, Number], default: 2 }
  }
}
</script>
