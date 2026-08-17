<template>
  <div class="wrap">
    <DashboardBody />
    <!-- <DashboardSkeleton /> -->
  </div>
</template>

<script setup lang="ts">
/** Dashboard shell: the framed viewport, holding a messaging UI that streams in behind a skeleton. */
import { defineAsyncComponent } from 'vue'
import DashboardSkeleton from '@/components/dashboard/DashboardSkeleton.vue'

const DashboardBody = defineAsyncComponent({
  loader: () => import('@/components/dashboard/DashboardBody.vue'),
  loadingComponent: DashboardSkeleton,
})
</script>

<style scoped>
/* Outer app container */
.wrap {
  display: flex;
  flex-grow: 1;
  height: 100dvh;
  max-width: 1400px;
  border-radius: 10px;
  overflow: hidden;
  margin: auto;
  box-shadow: 0 0 2px 0 #aaa;
}
@media only screen and (max-width: 768px) {
  .wrap {
    margin-bottom: auto !important;
  }
}
</style>
