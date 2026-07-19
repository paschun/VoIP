<template>
  <div v-if="field.$error" class="invalid-feedback d-block">
    <span v-for="error of field.$errors" :key="error">{{ error }}</span>
  </div>
</template>

<script lang="ts">
/** The Regle error block: renders `field.$errors` when the field is in error. Place after the input it describes. */
import { defineComponent, type PropType } from 'vue'
import type { RegleFieldStatus } from '@regle/core'

export default defineComponent({
  name: 'FieldErrors',
  props: {
    field: { type: Object as PropType<RegleFieldStatus>, required: true },
  },
})
</script>
