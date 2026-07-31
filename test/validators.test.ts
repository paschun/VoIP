import { test, expect, describe, vi, expectTypeOf, assert } from 'vitest'
import { Context, Hono } from 'hono'
import { sValidator } from '@hono/standard-validator'
import type { HTTPResponseError } from 'hono/types'
import { validator } from 'hono/validator'
import { model, Schema, Types, Error as MongooseError } from 'mongoose'
import type { StandardSchemaV1 } from '@standard-schema/spec'
import z from 'zod'
import { pathParams } from '../app/middleware/validate.ts'

// https://github.com/honojs/middleware/blob/main/packages/standard-validator/src/index.ts
// https://github.com/honojs/middleware/blob/main/packages/standard-validator/src/index.test.ts
// https://github.com/vitest-dev/vitest/pull/8527/changes

// const std = User['~standard']
// std.validate()
// User.validate()
//

/*
// types/mongoose-standard-schema.d.ts
import 'mongoose'; // makes this a module so `declare module` augments rather than redeclares

declare module 'mongoose' {
  namespace StandardSchemaV1 {
    interface Props<Output = unknown> {
      readonly types?: { readonly input: Output; readonly output: Output } | undefined;
    }
  }
}
*/

const thrw = (e: Error | HTTPResponseError) => {
  throw e
}

/** Await a request expected to reject and return the rejection value; fails if it resolves. */
const rejection = async (p: unknown): Promise<unknown> => {
  try {
    await p
  } catch (e) {
    return e
  }
  expect.unreachable('expected the request to reject')
}
// const idSchema = User.schema.pick(['_id'])
// const idSchema = userSchema.pick(['name'])
//   ProfileValidator as unknown as StandardSchemaV1<{ profile: string }, { profile: string }>,

describe('mongoose Id path param validator', () => {
  const Id = model('IdValidator', new Schema({ id: { type: Schema.Types.ObjectId, required: true } }, { _id: false, versionKey: false }))

  describe('hono standard validator sValidator', () => {
    describe('with mongoose model', () => {
      test('inline sValidator works', async () => {
        const app = new Hono()
        // rethrow errors so hono doesnt swallow them
        app.onError(thrw)
        const spyHook = vi.fn<(...args: unknown[]) => void>()
        app.get('/:id', sValidator('param', Id, spyHook))

        const id = '2'.repeat(24)
        await app.request(`/${id}`)

        expect(spyHook).toHaveBeenCalledWith({ data: { id }, success: true, target: 'param' }, expect.any(Context))
      })

      test('pathParams - sValidator wrapper works', async () => {
        const app = new Hono()
        app.onError(thrw)
        const handler = vi.fn<(c: Context) => Response>((c) => c.json({ ok: true }))
        app.get('/:id', pathParams(Id), handler)

        const id = 'f'.repeat(24)
        const res = await app.request(`/${id}`)
        expect(res.status).toBe(200)
        expect(await res.json()).toEqual({ ok: true })
        expect(handler).toHaveBeenCalled()
      })
    })

    test("standard schema type inference works", () => {
      type Output = StandardSchemaV1.InferOutput<typeof Id>
      expectTypeOf<Output>().toEqualTypeOf<{ id: Types.ObjectId }>()
      expectTypeOf<Output>().not.toEqualTypeOf<unknown>()
    })
  })

  test('hono generic validator', async () => {
    const id = 'a'.repeat(24)

    const app = new Hono()
    app.onError(thrw)
    app.get(
      '/:id',
      validator('param', async (value) => {
        const validated = await Id.validate(value)
        expect(validated).toEqual({ id: new Types.ObjectId(id) })
        expect(validated).not.toEqual({ id: id })
        const casted = Id.castObject(value)
        expect(casted).toEqual({ id: new Types.ObjectId(id) })
        expectTypeOf(casted).toEqualTypeOf<{ id: Types.ObjectId }>()
        return casted
      }),
      (c) => {
        const validParams = c.req.valid('param')
        expect(validParams).toEqual({ id: new Types.ObjectId(id) })
        expectTypeOf(validParams).toEqualTypeOf<{ id: Types.ObjectId }>()
        return c.json({ id }, 200)
      },
    )

    const good = await app.request(`/${id}`)
    expect(good).not.toBeNull()
    expect(good.status).toBe(200)
    expect(await good.json()).toEqual({ id })

    const err = await rejection(app.request(`/${null}`))
    assert.instanceOf(err, MongooseError.ValidationError)
    expect(err).toMatchInlineSnapshot(
      `[ValidationError: Validation failed: id: Cast to ObjectId failed for value "null" (type string) at path "id"]`,
    )
  })
})

describe('Profile Validator', () => {
  // interface ProfileId { profile: Types.ObjectId }

  // when profile is not "required" its type includes null and undefined
  const pvSchemaDef = { profile: { type: Schema.Types.ObjectId, required: true } } as const
  const pvSchemaOpts = { _id: false, versionKey: false, strict: 'throw' } as const // these dont have validators so dont have to disable them
  const pvSchema = new Schema(pvSchemaDef, pvSchemaOpts)
  const ProfileValidator = model('ProfileValidator', pvSchema)

  test('ProfileValidator registered validators', () => {
    expect(Object.keys(ProfileValidator.schema.paths)).toStrictEqual(['profile'])
    const profileSchema = ProfileValidator.schema.paths.profile
    assert.exists(profileSchema)
    expect(profileSchema.instance).toBe('ObjectId')
    expect(profileSchema.isRequired).toBe(true)
    expect(profileSchema.validators).toMatchObject([
      {
        message: 'Path `{PATH}` is required.',
        type: 'required',
      },
    ])
  })

  test('hono generic validator', async () => {
    const profileId = 'a'.repeat(24)
    const good = { profile: profileId }

    const app = new Hono()
    app.onError(thrw)
    app.post(
      '/post',
      validator('json', async (value: Record<string, unknown>) => {
        // https://github.com/Automattic/mongoose/blob/9.7.1/lib/model.js#L4339
        // validate is actually just schemaType.doValidate on each schema.path
        const validated = await ProfileValidator.validate(value)
        expectTypeOf(validated).toEqualTypeOf<{ profile: Types.ObjectId }>()
        expect(validated).toEqual({ profile: new Types.ObjectId(profileId) })
        expect(validated).not.toEqual({ id: profileId })
        expect(validated).not.toEqual({ profile: profileId })

        // validate() calls castObject internally
        // castObject returns TRawDocType
        const casted = ProfileValidator.castObject(value)
        expect(casted).toEqual({ profile: new Types.ObjectId(profileId) })
        expectTypeOf(casted.profile).not.toBeNullable()
        expectTypeOf(casted).not.toEqualTypeOf<{ profile?: Types.ObjectId | null }>() // when profile is not "required" it includes null and undefined
        expectTypeOf(casted).toEqualTypeOf<{ profile: Types.ObjectId }>()

        return casted
      }),
      (c) => {
        const validBody = c.req.valid('json')
        expect(validBody).toEqual({ profile: new Types.ObjectId(profileId) })
        expectTypeOf(validBody).toEqualTypeOf<{ profile: Types.ObjectId }>()

        return c.text('ok', 200)
      },
    )

    const res = await app.request('/post', {
      body: JSON.stringify(good),
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    expect(await res.text()).toBe('ok')

    const wrongLength = { profile: 'abcd' }
    const correctLengthButInvalidChars = { profile: 'z'.repeat(24) }
    const emptyStr = { profile: '' }
    const nulled = { profile: null }
    const undef = {}
    const explicitUndef = { profile: undefined }

    // have to include localhost when we construct Request ourselves: https://github.com/honojs/hono/blob/v4.12.26/src/hono-base.ts#L511
    const badReq = new Request('http://localhost/post', {
      body: JSON.stringify(wrongLength),
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    // app.request returns `Response | Promise<Response>`
    const err = await rejection(app.request(badReq))
    assert.instanceOf(err, Error)
    assert.instanceOf(err, MongooseError.ValidationError)
    assert.instanceOf(err.errors.profile, MongooseError.CastError)
    expect(err).toMatchInlineSnapshot(
      `[ValidationError: Validation failed: profile: Cast to ObjectId failed for value "abcd" (type string) at path "profile"]`,
    )
    expect(err.errors.profile).toMatchInlineSnapshot(
      `[CastError: Cast to ObjectId failed for value "abcd" (type string) at path "profile"]`,
    )
    expect(err.errors.profile.reason).toMatchInlineSnapshot(
      `[BSONError: input must be a 24 character hex string, 12 byte Uint8Array, or an integer]`,
    )

    // https://github.com/Automattic/mongoose/blob/9.7.1/lib/error/validation.js#L20
    expect(err).toMatchObject({
      name: 'ValidationError',
      message: 'Validation failed: profile: Cast to ObjectId failed for value "abcd" (type string) at path "profile"',
      errors: {
        profile: {
          name: 'CastError',
          message: 'Cast to ObjectId failed for value "abcd" (type string) at path "profile"',
          path: 'profile',
          kind: 'ObjectId',
          value: 'abcd',
          stringValue: '"abcd"',
          valueType: 'string',
          reason: {
            name: 'BSONError',
            message: 'input must be a 24 character hex string, 12 byte Uint8Array, or an integer',
          },
        },
      },
    })

    await expect(
      app.request('/post', {
        body: JSON.stringify(correctLengthButInvalidChars),
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    ).rejects.toMatchObject({
      name: 'ValidationError',
      message:
        'Validation failed: profile: Cast to ObjectId failed for value "zzzzzzzzzzzzzzzzzzzzzzzz" (type string) at path "profile"',
      errors: {
        profile: {
          name: 'CastError',
          message: 'Cast to ObjectId failed for value "zzzzzzzzzzzzzzzzzzzzzzzz" (type string) at path "profile"',
          stringValue: '"zzzzzzzzzzzzzzzzzzzzzzzz"',
          kind: 'ObjectId',
          value: 'zzzzzzzzzzzzzzzzzzzzzzzz',
          path: 'profile',
          valueType: 'string',
          reason: {
            name: 'BSONError',
            message: 'input must be a 24 character hex string, 12 byte Uint8Array, or an integer',
          },
        },
      },
    })

    await expect(
      app.request('/post', {
        body: JSON.stringify(emptyStr),
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    ).rejects.toMatchObject({
      name: 'ValidationError',
      message: 'Validation failed: profile: Cast to ObjectId failed for value "" (type string) at path "profile"',
      errors: {
        profile: {
          name: 'CastError',
          message: 'Cast to ObjectId failed for value "" (type string) at path "profile"',
          kind: 'ObjectId',
          path: 'profile',
          reason: {
            name: 'BSONError',
            message: 'input must be a 24 character hex string, 12 byte Uint8Array, or an integer',
          },
        },
      },
    })

    await expect(
      app.request('/post', {
        body: JSON.stringify(nulled),
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    ).rejects.toMatchObject({
      name: 'ValidationError',
      errors: {
        profile: {
          name: 'ValidatorError',
          kind: 'required',
          properties: {
            path: 'profile',
            type: 'required',
          },
        },
      },
    })

    await expect(
      app.request('/post', {
        body: JSON.stringify(undef),
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    ).rejects.toMatchObject({
      name: 'ValidationError',
      message: 'Validation failed: profile: Path `profile` is required.',
      errors: {
        profile: {
          name: 'ValidatorError',
          message: 'Path `profile` is required.',
          kind: 'required',
          path: 'profile',
          properties: {
            type: 'required',
            path: 'profile',
            message: 'Path `profile` is required.',
          },
        },
      },
    })

    await expect(
      app.request('/post', {
        body: JSON.stringify(explicitUndef),
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    ).rejects.toMatchObject({
      name: 'ValidationError',
      message: 'Validation failed: profile: Path `profile` is required.',
      errors: {
        profile: {
          name: 'ValidatorError',
          message: 'Path `profile` is required.',
          kind: 'required',
          path: 'profile',
          properties: {
            type: 'required',
            path: 'profile',
            message: 'Path `profile` is required.',
          },
        },
      },
    })
  })

  describe('with hono standard validator', () => {
    test('works with hook', async () => {
      const profileId = 'e'.repeat(24)
      const payload = { profile: profileId }

      const app = new Hono()
      app.onError(thrw)
      const hook = vi.fn<(...args: unknown[]) => void>()
      app.post('/post', sValidator('json', ProfileValidator, hook))

      await app.request('/post', {
        body: JSON.stringify(payload),
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      expect(hook).toHaveBeenCalledWith(
        { data: { profile: profileId }, success: true, target: 'json' },
        expect.any(Context),
      )
    })

    describe('type inference', () => {
      test('works with zod schema', async () => {
        const payload = { profile: '1'.repeat(24) }
        const zProfileId = z.object({ profile: z.string().length(24) })
        type ZOut = StandardSchemaV1.InferOutput<typeof zProfileId>
        expectTypeOf<ZOut>().toEqualTypeOf(payload)

        const app = new Hono()
        app.onError(thrw)
        app.post(
          '/post',
          sValidator('json', zProfileId, (result) => {
            expect(result.success).toBe(true)
            expect(result.data).toEqual(payload)
            expectTypeOf(result.data).toEqualTypeOf<{ profile: string }>()
          }),
        )

        await app.request('/post', {
          body: JSON.stringify(payload),
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      })

      test("works with mongoose model", async () => {
        const payload = { profile: '7'.repeat(24) }
        // type SOut = StandardSchemaV1.InferOutput<typeof ProfileValidator>

        const app = new Hono()
        app.onError(thrw)
        app.post(
          '/post',
          sValidator('json', ProfileValidator, (result) => {
            expect(result.success).toBe(true)
            expect(result.data).toEqual(payload)
            // hook's `result.data` is typed to validator input, not output:
            // https://github.com/honojs/middleware/blob/main/packages/standard-validator/src/index.ts#L140
            expectTypeOf(result.data).not.toEqualTypeOf<{ profile: string }>()
            expectTypeOf(result.data).toEqualTypeOf<{ profile: Types.ObjectId }>()
            expectTypeOf(result.data).not.toEqualTypeOf<unknown>()
          }),
        )

        await app.request('/post', {
          body: JSON.stringify(payload),
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      })
    })

    test('with no hook', async () => {
      const profileId = 'b'.repeat(24)
      const payload = { profile: profileId }

      const app = new Hono()
      app.onError(thrw)

      app.post('/post', sValidator('json', ProfileValidator), (c) => {
        const valid = c.req.valid('json')

        expect(valid).toEqual({ profile: new Types.ObjectId(profileId) })
        expect(valid).not.toHaveProperty('_id') // type says _id is on the obj but it isn't really
        expectTypeOf(valid).not.toEqualTypeOf<{ profile: string }>()
        expectTypeOf(valid).toEqualTypeOf<{ profile: Types.ObjectId }>()
        expectTypeOf(valid).not.toEqualTypeOf<unknown>()

        return c.text('ok', 200)
      })

      const req = new Request('http://localhost/post', {
        body: JSON.stringify(payload),
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const good = await app.request(req)
      expect(await good.text()).toBe('ok')
    })
  })

  test('schema matcher (asymmetric) doesnt work with async mongoose validator', () => {
    const data = { profile: 'c'.repeat(24) }
    expect(() => expect(data).toEqual(expect.schemaMatching(ProfileValidator))).toThrowErrorMatchingInlineSnapshot(
      `[TypeError: Async schema validation is not supported in asymmetric matchers.]`,
    )
  })
})
