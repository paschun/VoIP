import { useLocalStorage } from '@vueuse/core'
import type { RemovableRef } from '@vueuse/core'
import type { z } from 'zod'

/**
 * `useLocalStorage` (VueUse) backed by a Zod schema: a reactive ref synced to
 * localStorage that validates on every read and write. Malformed/absent stored
 * JSON falls back to `defaults` rather than throwing, so a corrupted value can
 * never crash startup.
 */
export function useValidatedStorage<T>(key: string, schema: z.ZodType<T>, defaults: T): RemovableRef<T> {
  return useLocalStorage<T>(key, defaults, {
    // object serializer also uses JSON.parse/stringify: https://github.com/vueuse/vueuse/blob/main/packages/core/useStorage/index.ts
    serializer: {
      read: (raw): T => {
        try {
          const result = schema.safeParse(JSON.parse(raw))
          return result.success ? result.data : defaults
        } catch {
          return defaults
        }
      },
      write: (value): string => JSON.stringify(value),
    },
  })
}
