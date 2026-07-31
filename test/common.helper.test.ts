import { mkdir, mkdtemp, readdir, rm, utimes, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { subDays } from 'date-fns'
import { combineURLs, pruneOldUploads, UPLOAD_RETENTION_DAYS, UPLOAD_ROOT } from '../app/helper/common.helper.ts'

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

// The upload root is resolved against the cwd, so each case runs inside a throwaway dir.
describe('pruneOldUploads', () => {
  const originalCwd = process.cwd()
  const seedFolder = async (name: string, lastWrittenDaysAgo: number) => {
    const dir = `${UPLOAD_ROOT}/${name}`
    await mkdir(dir, { recursive: true })
    await writeFile(`${dir}/image.png`, 'x')
    const mtime = subDays(new Date(), lastWrittenDaysAgo)
    await utimes(dir, mtime, mtime)
  }
  const rootEntries = async () => (await readdir(UPLOAD_ROOT)).sort()

  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'uploads-'))
    process.chdir(tmpDir)
  })

  afterEach(async () => {
    process.chdir(originalCwd)
    await rm(tmpDir, { recursive: true, force: true })
  })

  test('removes every folder past the retention window, whatever its name looks like', async () => {
    await seedFolder('20260101', 90)
    await seedFolder('2026-03-20', UPLOAD_RETENTION_DAYS + 1)
    await seedFolder('20260326', UPLOAD_RETENTION_DAYS - 1)
    await seedFolder('20260327', 0)

    const removed = await pruneOldUploads()
    expect(removed.sort()).toEqual(['2026-03-20', '20260101'])
    await expect(rootEntries()).resolves.toEqual(['20260326', '20260327'])
  })

  test('keeps a folder written to inside the window even when its name reads old', async () => {
    await seedFolder('19990101', 0)

    await expect(pruneOldUploads()).resolves.toEqual([])
    await expect(rootEntries()).resolves.toEqual(['19990101'])
  })

  test('leaves loose files in the root alone', async () => {
    const stray = `${UPLOAD_ROOT}/stray.png`
    await mkdir(UPLOAD_ROOT, { recursive: true })
    await writeFile(stray, 'x')
    const mtime = subDays(new Date(), 90)
    await utimes(stray, mtime, mtime)

    await expect(pruneOldUploads()).resolves.toEqual([])
    await expect(rootEntries()).resolves.toEqual(['stray.png'])
  })

  test('resolves to nothing when the upload root does not exist', async () => {
    await expect(pruneOldUploads()).resolves.toEqual([])
  })
})
