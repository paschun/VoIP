import { describe, test, expectTypeOf } from 'vitest'
import type { WireDoc } from '../shared/schema/wire.ts'
import type { EmailDoc } from '../shared/schema/email.ts'
import { contactSchema } from '../app/model/contact.model.ts'
import { mediaSchema } from '../app/model/media.model.ts'
import { settingSchema } from '../app/model/setting.model.ts'

// Compile-time checks that `WireDoc` mirrors what `c.json` emits: ObjectId/Date -> string, booleans/`__v` preserved,
// and no virtuals leak in (it derives from the raw doc) -- hence no `id`. Pure type assertions; `npx tsc` verifies them.
// `EmailDoc` is a real wire type used across the app; the other three exist only here, so build them inline from their
// schema. `SettingDoc` adds its populate-only count virtuals (optional numbers) on top of the raw wire shape.
type ContactDoc = WireDoc<typeof contactSchema>
type MediaDoc = WireDoc<typeof mediaSchema>
type SettingDoc = WireDoc<typeof settingSchema> & { messageCount?: number; totalCount?: number }

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
  test('ObjectId/Date -> string; counts are optional numbers', () => {
    expectTypeOf<SettingDoc['_id']>().toEqualTypeOf<string>()
    expectTypeOf<SettingDoc['created_at']>().toEqualTypeOf<string>()
    expectTypeOf<SettingDoc['messageCount']>().toEqualTypeOf<number | undefined>()
    expectTypeOf<SettingDoc['totalCount']>().toEqualTypeOf<number | undefined>()
  })
})
