import { describe, test, expectTypeOf } from 'vitest'
import type { EmailDoc } from '../shared/schema/email.ts'
import type { ContactDoc } from '../shared/schema/contact.ts'
import type { MediaDoc } from '../shared/schema/media.ts'
import type { SettingDoc } from '../shared/schema/setting.ts'

// Compile-time contract checks on `WireDoc<typeof schema>`: it must mirror exactly what `c.json` emits -- ObjectId/Date
// stringified, booleans preserved, `__v` present -- and must NOT carry a phantom `id`. Only `settingSchema` opts into
// mongoose's built-in `id` virtual (it sets `toJSON: { virtuals: true }`); email/contact/media don't, so their wire
// type must stay free of `id` or a component reading `doc.id` would type-check against a field the server never sends.
// These are pure type assertions -- no runtime, no DB; `npx tsc` is what actually verifies them.

describe('EmailDoc wire shape', () => {
  test('ObjectId/Date -> string, booleans preserved, __v present, no phantom id', () => {
    expectTypeOf<EmailDoc>().not.toHaveProperty('id')
    expectTypeOf<EmailDoc['_id']>().toEqualTypeOf<string>()
    expectTypeOf<EmailDoc['user']>().toEqualTypeOf<string>()
    expectTypeOf<EmailDoc['created_at']>().toEqualTypeOf<string>()
    expectTypeOf<EmailDoc['secure']>().toEqualTypeOf<boolean>()
    expectTypeOf<EmailDoc['pgpEncryptEnabled']>().toEqualTypeOf<boolean>()
    expectTypeOf<EmailDoc['__v']>().toEqualTypeOf<number>()
  })
})

describe('ContactDoc wire shape', () => {
  test('custom EmptyString -> string, ObjectId/Date -> string, no phantom id', () => {
    expectTypeOf<ContactDoc>().not.toHaveProperty('id')
    expectTypeOf<ContactDoc['first_name']>().toEqualTypeOf<string>()
    expectTypeOf<ContactDoc['number']>().toEqualTypeOf<string>()
    expectTypeOf<ContactDoc['user']>().toEqualTypeOf<string>()
    expectTypeOf<ContactDoc['created_at']>().toEqualTypeOf<string>()
    expectTypeOf<ContactDoc['__v']>().toEqualTypeOf<number>()
  })
})

describe('MediaDoc wire shape', () => {
  test('media stays string, ObjectId -> string, no phantom id', () => {
    expectTypeOf<MediaDoc>().not.toHaveProperty('id')
    expectTypeOf<MediaDoc['media']>().toEqualTypeOf<string>()
    expectTypeOf<MediaDoc['user']>().toEqualTypeOf<string>()
    expectTypeOf<MediaDoc['__v']>().toEqualTypeOf<number>()
  })
})

describe('SettingDoc wire shape', () => {
  test('ObjectId/Date -> string; count virtuals are optional numbers (declared, not inferable)', () => {
    expectTypeOf<SettingDoc['_id']>().toEqualTypeOf<string>()
    expectTypeOf<SettingDoc['created_at']>().toEqualTypeOf<string>()
    expectTypeOf<SettingDoc['messageCount']>().toEqualTypeOf<number | undefined>()
    expectTypeOf<SettingDoc['totalCount']>().toEqualTypeOf<number | undefined>()
  })
})
