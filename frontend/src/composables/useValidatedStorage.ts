import { useStorage } from '@vueuse/core'
import type { RemovableRef } from '@vueuse/core'
import type { z } from 'zod'

/**
 * `useStorage` (VueUse) backed by a Zod schema: a reactive ref synced to
 * localStorage that validates on every read and write. Malformed/absent stored
 * JSON falls back to `defaults` rather than throwing, so a corrupted value can
 * never crash startup.
 */
export function useValidatedStorage<T> (
  key: string,
  schema: z.ZodType<T>,
  defaults: T
): RemovableRef<T> {
  return useStorage<T>(key, defaults, localStorage, {
    serializer: {
      read: (raw): T => {
        try {
          const result = schema.safeParse(JSON.parse(raw))
          return result.success ? result.data : defaults
        } catch {
          return defaults
        }
      },
      write: (value): string => JSON.stringify(value)
    }
  })
}
