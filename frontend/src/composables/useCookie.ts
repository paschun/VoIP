import { shallowRef, watch } from 'vue'
import type { Ref } from 'vue'
import Cookies from 'js-cookie'

function decode (raw: string) {
  try {
    const parsed = JSON.parse(raw)
    // keep number-like strings that don't round-trip (precision loss / overflow) as strings
    if (typeof parsed === 'number' && String(parsed) !== raw) return raw
    return parsed
  } catch {
    return raw
  }
}

const encode = (value: unknown): string => (typeof value === 'string' ? value : JSON.stringify(value))

/**
 * Reactive `Ref` over a js-cookie value: strings are stored as-is, everything else JSON-encoded, so it interops with
 * bare-string cookies (the auth token) and object cookies alike. In-app reactive only -- share one ref via a store.
 */
export function useCookie<T = string> (key: string, options?: Cookies.CookieAttributes): Ref<T | null> {
  const read = (): T | null => {
    const raw = Cookies.get(key)
    return raw === undefined ? null : decode(raw)
  }

  const data = shallowRef<T | null>(read())

  watch(data, (value) => {
    if (value === null || value === undefined) Cookies.remove(key, options)
    else Cookies.set(key, encode(value), options)
  })

  return data
}
