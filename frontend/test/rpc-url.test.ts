import { describe, test, expect, expectTypeOf } from 'vitest'
import { hc } from 'hono/client'
import type { AppType } from '../../app.ts'

// Documents how `hc(...).$url()` builds a URL -- the frontend uses it for the media-upload path 
// `AppType` is type-only, so this never imports/boots the server.
// AppType is just for typescript
// client.* keys can actually be anything if AppType is omitted.
// The key/path names are only enforced by typescript, not JS

// untested : relative URLs

describe('hc().$url()', () => {
  test('uses the absolute origin passed to hc and includes the /api route prefix', () => {
    const client = hc<AppType>('http://localhost:3000')
    const url = client.api.media.uploads.$url()
    expect(url.href).toBe('http://localhost:3000/api/media/uploads')
    expect(url.toJSON()).toBe('http://localhost:3000/api/media/uploads')
    expect(url.toString()).toBe('http://localhost:3000/api/media/uploads')
    expect(url).toMatchObject({
      href: 'http://localhost:3000/api/media/uploads',
      origin: 'http://localhost:3000',
      protocol: 'http:',
      username: '',
      password: '',
      host: 'localhost:3000',
      hostname: 'localhost',
      port: '3000',
      pathname: '/api/media/uploads',
      search: '',
      searchParams: new URLSearchParams({}),
      hash: '',      
    })
    expectTypeOf(url).toEqualTypeOf<URL>()
    expect(url).toBeInstanceOf(URL)
  })

  test('a same-origin (https) base works the same way', () => {
    const client = hc<AppType>('https://app.example.com')
    expect(client.api.media.uploads.$url().href).toBe('https://app.example.com/api/media/uploads')
  })

  test('a base with a trailing slash does not double up the separator', () => {
    const client = hc<AppType>('http://localhost:3000/')
    expect(client.api.media.uploads.$url().href).toBe('http://localhost:3000/api/media/uploads')
  })
})
