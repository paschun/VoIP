<template>
  <!-- Two roots, so both panes are flex children of the shell, exactly like the offcanvas + chat pane they stand in for. -->
  <div class="col-12 col-md-5 skeleton-sidebar">
    <div class="skeleton-header sidebar-edge"></div>
    <div class="skeleton-search"><div class="skeleton-search-box"></div></div>
    <ListSkeleton />
  </div>
  <section class="col d-none d-md-block skeleton-pane">
    <div class="skeleton-header"></div>
  </section>
</template>

<script setup lang="ts">
/**
 * Stand-in for the dashboard while its chunk loads. Carries its own layout rules rather than reusing the body's, whose
 * stylesheet only arrives with the chunk this is covering for.
 */
import ListSkeleton from '@/components/shared/ListSkeleton.vue'
</script>

<style scoped>
/* Below md the real sidebar is a drawer that starts open, so it owns the full width there. */
.skeleton-sidebar {
  max-width: min(400px, 100%);
  background-color: var(--contact-list);
}
.skeleton-pane {
  min-width: 0;
  background-color: var(--background-color-primary);
}
/* Matches the sidebar header and chat head it stands in for. */
.skeleton-header {
  height: 60px;
  background: var(--background-color-secondary);
}
.sidebar-edge {
  border-right: 1px solid var(--divider-color);
}
/* Matches SearchBar, which heads the conversation list. */
.skeleton-search {
  width: 100%;
  height: 45px;
  background: var(--background-color-primary);
  display: flex;
}
.skeleton-search-box {
  width: calc(100% - 20px);
  height: 30px;
  margin: auto;
  border-radius: 15px;
  background-color: var(--background-color-secondary);
}
</style>
