import Papa from 'papaparse'
import { e164Phone } from '@shared/contracts/phone.ts'
import { notifyError } from '@/notify.ts'
import type { ContactDraft } from '@/stores/contact.ts'

const CSV_COLUMNS = ['first_name', 'last_name', 'number', 'note'] satisfies (keyof ContactDraft)[]

function convertToCsv(rows: ContactDraft[]): string {
  const header = CSV_COLUMNS.join(',')
  const body = rows.map((row) => CSV_COLUMNS.map((prop) => row[prop]).join(',')).join('\r\n')
  return header + '\r\n' + body + '\r\n'
}

/** Trigger a browser download of `rows` as `<filename>.csv`. */
export function downloadContactsCsv(rows: ContactDraft[], filename: string): void {
  const csvData = convertToCsv(rows)
  const blob = new Blob(['\ufeff' + csvData], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const dwldLink = document.createElement('a')
  const isSafariBrowser = navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome')
  if (isSafariBrowser) dwldLink.setAttribute('target', '_blank')
  dwldLink.setAttribute('href', url)
  dwldLink.setAttribute('download', filename + '.csv')
  dwldLink.style.visibility = 'hidden'
  document.body.appendChild(dwldLink)
  dwldLink.click()
  document.body.removeChild(dwldLink)
}

const sampleContacts = [
  {
    first_name: 'John',
    last_name: 'Doe',
    number: '12300XXXXX',
    note: 'notes go here',
  },
] satisfies ContactDraft[]

/** Download the one-row example CSV showing the importable column layout. */
export function downloadSampleCsv(): void {
  downloadContactsCsv(sampleContacts, 'sample_file')
}

/** Parse an import CSV into contact rows; parse errors and invalid phone numbers toast and are dropped. */
export async function parseCsvContacts(file: File): Promise<ContactDraft[]> {
  const fileText = await file.text()

  const { data: csvdata, errors } = Papa.parse<string[]>(fileText, { header: false })
  if (errors.length) {
    errors.forEach((err) => void notifyError(JSON.stringify(err), 'Error parsing CSV'))
    return []
  }

  // Skip the header row; keep rows with a non-empty first name and a valid phone number (stored canonical E.164).
  const parsed = csvdata
    .slice(1)
    .filter((row) => typeof row[0] === 'string' && row[0] !== '')
    .map((row) => ({ first_name: row[0], last_name: row[1], number: e164Phone.safeParse(row[2]), note: row[3] }))
  const rows = parsed.flatMap(({ number, ...rest }) => (number.success ? [{ ...rest, number: number.data }] : []))
  const dropped = parsed.length - rows.length
  if (dropped) void notifyError(`${dropped} row(s) skipped: invalid phone number`)
  return rows
}
