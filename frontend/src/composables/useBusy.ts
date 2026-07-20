import { ref } from 'vue'

/** A boolean `busy` flag plus `run`, which holds it `true` while the wrapped async operation is in flight. */
export function useBusy() {
  const busy = ref(false)
  async function run<T>(fn: () => Promise<T>): Promise<T> {
    busy.value = true
    try {
      return await fn()
    } finally {
      busy.value = false
    }
  }
  return { busy, run }
}
