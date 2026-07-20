import { computed, ref } from 'vue'

/**
 * A search-box `query` ref plus the filtered view of `items` (case-insensitive substring match over `fields`).
 * Plain-text matching, so regex metacharacters in the query are safe.
 */
export function useSearchFilter<T>(items: () => T[], fields: (item: T) => (string | null | undefined)[]) {
  const query = ref('')
  const results = computed(() => {
    const q = query.value.toLowerCase()
    return items().filter((item) => fields(item).some((f) => f?.toLowerCase().includes(q)))
  })
  return { query, results }
}
