import { z } from 'zod'

/**
 * Media content types we store and the chat view can display (it renders every attachment as `<img>`). Applies in both
 * directions: outgoing uploads outside this set are rejected (422), incoming attachments outside it are logged and
 * skipped. The inbound webhook gate is broader -- see the per-provider `*_INBOUND_CONTENT_TYPES` below.
 */
export const displayableMediaContentType = z.enum(['image/jpeg', 'image/png', 'image/gif'])
export type DisplayableMediaContentType = z.infer<typeof displayableMediaContentType>

/**
 * Content types the Twilio inbound-SMS webhook validator accepts per attachment. Twilio publishes no inbound list, so
 * this is the "MMS: Yes" rows of their accepted-types-for-sending page
 * (https://www.twilio.com/docs/messaging/guides/accepted-mime-types) -- the closest documented bound on what an
 * inbound webhook may carry.
 */
export const TWILIO_INBOUND_CONTENT_TYPES: readonly string[] = [
  'image/jpeg', 'image/jpg', 'image/gif', 'image/png', 'image/heic', 'image/heif', 'image/tiff', 'image/bmp',
  'video/mpeg4', 'video/mp4', 'video/mpeg', 'video/webm', 'video/quicktime', 'video/3gpp', 'video/3gpp2',
  'video/3gpp-tt', 'video/H261', 'video/H263', 'video/H263-1998', 'video/H263-2000', 'video/H264', 'video/H265',
  'audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/mp3', 'audio/3gpp', 'audio/3gpp2', 'audio/basic', 'audio/L24',
  'audio/vnd.rn-realaudio', 'audio/vnd.wave', 'audio/ac3', 'audio/webm', 'audio/amr-nb', 'audio/amr',
  'text/vcard', 'text/x-vcard', 'text/directory', 'text/csv', 'text/richtext', 'text/rtf', 'text/calendar',
  'application/pdf', 'application/vcard',
]

/**
 * Content types the Telnyx inbound-SMS webhook validator accepts per attachment. Telnyx publishes no inbound list
 * either; this maps the formats of their outbound MMS-transcoding table (JPEG/PNG/GIF/BMP/TIFF/WebP images,
 * MP4/3GP/MOV video, MP3/WAV/AMR/OGG audio, PDF/vCard/iCal documents --
 * https://developers.telnyx.com/docs/messaging/messages/mms-transcoding) to MIME strings, plus text/plain and
 * application/octet-stream (Telnyx accepts it and sniffs the real type) from
 * https://support.telnyx.com/en/articles/4450150-faqs-about-mms-at-telnyx#h_6e87d7d303. The list isn't in their
 * OpenAPI spec, whose `media_urls` schema only carries the 1 MB total-size cap.
 */
export const TELNYX_INBOUND_CONTENT_TYPES: readonly string[] = [
  'image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/tiff', 'image/webp',
  'video/mp4', 'video/3gpp', 'video/quicktime',
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/amr', 'audio/ogg',
  'application/pdf', 'text/vcard', 'text/x-vcard', 'text/calendar', 'text/plain', 'application/octet-stream',
]

/**
 * Provider MMS send caps: at most 10 attachments, total media size limited. Neither provider defines "MB" in bytes, so
 * decimal (the smaller reading) keeps us from accepting what the provider might reject.
 * Twilio 5 MB / 10 files: https://www.twilio.com/docs/messaging/guides/accepted-mime-types,
 * https://www.twilio.com/docs/messaging/api/media-resource
 * Telnyx 1 MB / 10 media_urls: https://developers.telnyx.com/docs/messaging/messages/mms-transcoding
 */
export const OUTBOUND_MMS_MAX_ATTACHMENTS = 10
export const OUTBOUND_MMS_TOTAL_BYTES = { twilio: 5_000_000, telnyx: 1_000_000 } as const

// The client streams the raw file body to the upload route to measure progress (see Dashboard.vue's `uploadFile`), so
// there's no multipart part to read a filename from. Instead the request `Content-Type` is validated against the
// accepted image types and the stored-file extension is derived from it -- no client-supplied filename is trusted.
export const uploadHeaders = z.object({ 'content-type': displayableMediaContentType })
export type UploadHeaders = z.infer<typeof uploadHeaders>

/** Stored-file extension (with leading dot) keyed by accepted content type. */
export const CONTENT_TYPE_TO_EXT: Record<DisplayableMediaContentType, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
}
