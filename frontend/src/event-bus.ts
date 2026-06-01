// Vue 3 removed the instance event-emitter API (`$on`/`$off`/`$emit`) that the
// old `new Vue()` bus relied on. This is a tiny standalone emitter exposing the
// same `$on` / `$once` / `$off` / `$emit` surface so existing call sites
// (`EventBus.$on(...)`, `EventBus.$emit(...)`) keep working unchanged.
type Handler = (...args: any[]) => void

class Emitter {
  #listeners = new Map<string, Set<Handler>>()

  $on (event: string, fn: Handler): this {
    if (!this.#listeners.has(event)) this.#listeners.set(event, new Set())
    this.#listeners.get(event)!.add(fn)
    return this
  }

  $once (event: string, fn: Handler): this {
    const wrap: Handler = (...args) => {
      this.$off(event, wrap)
      fn(...args)
    }
    return this.$on(event, wrap)
  }

  $off (event?: string, fn?: Handler): this {
    if (event === undefined) {
      this.#listeners.clear()
    } else if (fn === undefined) {
      this.#listeners.delete(event)
    } else {
      this.#listeners.get(event)?.delete(fn)
    }
    return this
  }

  $emit (event: string, ...args: any[]): this {
    this.#listeners.get(event)?.forEach((fn) => { fn(...args) })
    return this
  }
}

export const EventBus = new Emitter()
