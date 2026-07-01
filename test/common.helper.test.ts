import { describe, test, expect } from 'vitest'
import { combineURLs } from '../app/helper/common.helper.ts'

// These pin down the slash handling: collapse doubles at each seam, but preserve a leading slash on the first segment
// and a trailing slash on the last.
describe('combineURLs', () => {
  test.each([
    {
      segments: ['https://api.telnyx.com', 'api/call/telnyx'],
      expected: 'https://api.telnyx.com/api/call/telnyx',
      name: 'joins a host and a path with one slash',
    },
    {
      segments: ['https://api.telnyx.com/', '/api/call'],
      expected: 'https://api.telnyx.com/api/call',
      name: 'collapses the trailing+leading slash at a seam',
    },
    { segments: ['/a', 'b/'], expected: '/a/b/', name: 'keeps a leading slash on the first and trailing on the last' },
    { segments: ['a', 'b', 'c'], expected: 'a/b/c', name: 'joins more than two segments' },
    { segments: ['a///', '///b'], expected: 'a/b', name: 'collapses multiple slashes on both sides of a seam' },
    { segments: ['solo'], expected: 'solo', name: 'returns a single segment untouched' },
    { segments: [], expected: '', name: 'returns an empty string for no segments' },
  ])('$name', ({ segments, expected }) => {
    expect(combineURLs(...segments)).toBe(expected)
  })
})
