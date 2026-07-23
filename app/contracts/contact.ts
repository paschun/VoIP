import * as z from 'zod'
import { e164Phone } from '../../shared/phone.ts'

// Create / full-update body: first_name + number required, the rest optional. The model fields are plain (unvalidated)
// Strings, so these required-field constraints live only here, not in the schema.
export const contactBody = z.object({
  first_name: z.string().min(1),
  number: e164Phone,
  last_name: z.string().optional(),
  note: z.string().optional(),
})
export type ContactRequest = z.infer<typeof contactBody>

// Bulk import (CSV): only `number` is needed; names/note are best-effort, matching the lenient original.
export const contactBulkItem = z.object({
  number: e164Phone,
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  note: z.string().optional(),
})
export const contactBulkBody = z.object({ contacts: z.array(contactBulkItem) })
export type ContactBulkRequest = z.infer<typeof contactBulkBody>

export const contactIdParam = z.object({ id: z.string().min(1) })
export type ContactIdParam = z.infer<typeof contactIdParam>
