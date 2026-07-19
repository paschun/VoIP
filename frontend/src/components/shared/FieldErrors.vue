<template>
  <div v-if="field.$error" class="invalid-feedback d-block">
    <span v-for="error of field.$errors" :key="error">{{ error }}</span>
  </div>
</template>

<script setup lang="ts">
/** The Regle error block: renders `field.$errors` when the field is in error. Place after the input it describes. */
import type { RegleFieldStatus } from '@regle/core'

defineProps<{ field: RegleFieldStatus }>()
</script>
