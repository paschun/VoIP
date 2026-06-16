import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import Contact from '../model/contact.model.ts'
import Message from '../model/message.model.ts'
import { factory } from '../factory.ts'
import type { Env, JsonCtx, ParamCtx, QueryCtx, ParamJsonCtx } from '../factory.ts'
import { auth } from '../middleware/auth.hono.ts'
import { jsonBody, pathParams, queryParams } from '../validate.ts'
import { sendDoc, sendDocs } from '../util/respond.hono.ts'
import type { Ok } from '../../shared/api-contracts.ts'
import type { ContactDoc } from '../../shared/schema/contact.ts'
import {
  contactBody, type ContactRequest,
  contactBulkBody, type ContactBulkRequest,
  contactLookupQuery, type ContactLookupQuery,
  contactIdParam, type ContactIdParam,
} from '../../shared/contracts/contact.ts'

const MAX_CONTACTS = 500

// Canonicalize a phone number: drop a leading '+', then prefix the country code by digit count (10 digits -> +1).
// TODO: could normalizeNumber be in zod?
function normalizeNumber(raw: string): string {
  const digits = raw.trim().replace('+', '')
  if (digits.length > 10) return `+${digits}`
  if (digits.length === 10) return `+1${digits}`
  return digits
}

async function getContacts(c: Context<Env>) {
  // sort `1` == ascending
  const data = await Contact.find({ user: { $eq: c.get('user').id } }).collation({ locale: 'en' }).sort({ first_name: 1 })
  return sendDocs<ContactDoc>(c, data)
}

async function lookupContact(c: QueryCtx<ContactLookupQuery>) {
  const number = normalizeNumber(c.req.valid('query').number)
  const contact = await Contact.findOne({ user: { $eq: c.get('user').id }, number: { $eq: number } })
  // note: only first_name and last_name are used by client
  return sendDoc<ContactDoc | null>(c, contact)
}

async function createContact(c: JsonCtx<ContactRequest>) {
  const body = c.req.valid('json')
  const user = c.get('user').id
  const number = normalizeNumber(body.number)
  const exists = await Contact.findOne({ user: { $eq: user }, number: { $eq: number } })
  if (exists) throw new HTTPException(409, { message: 'Number already exists!' })
  if (await Contact.countDocuments({ user: { $eq: user } }) >= MAX_CONTACTS) {
    throw new HTTPException(422, { message: 'Cannot have more than 500 contacts!' })
  }
  const saved = await Contact.create({ user, number, first_name: body.first_name, last_name: body.last_name ?? '', note: body.note ?? '' })
  await Message.updateMany({ user: { $eq: user }, number: { $eq: number } }, { contact: saved._id })
  return sendDoc<ContactDoc>(c, saved)
}

async function bulkCreateContacts(c: JsonCtx<ContactBulkRequest>) {
  const user = c.get('user').id
  let created = 0
  for (const item of c.req.valid('json').contacts) {
    const number = normalizeNumber(item.number)
    const exists = await Contact.findOne({ user: { $eq: user }, number: { $eq: number } })
    if (exists) continue
    if (await Contact.countDocuments({ user: { $eq: user } }) >= MAX_CONTACTS) continue
    await Contact.create({ user, number, first_name: item.first_name ?? '', last_name: item.last_name ?? '', note: item.note ?? '' })
    created++
  }
  // TODO: `data: created` isnt used on the client at all. maybe we can omit it.
  return c.json({ data: { created } } satisfies Ok<{ created: number }>)
}

async function updateContact(c: ParamJsonCtx<ContactIdParam, ContactRequest>) {
  const { id } = c.req.valid('param')
  const body = c.req.valid('json')
  const contact = await Contact.findOne({ _id: { $eq: id } })
  if (!contact) throw new HTTPException(404, { message: 'Contact not found!' })
  contact.first_name = body.first_name
  contact.last_name = body.last_name ?? ''
  contact.number = normalizeNumber(body.number)
  contact.note = body.note ?? ''
  await contact.save()
  return sendDoc<ContactDoc>(c, contact)
}

async function deleteContact(c: ParamCtx<ContactIdParam>) {
  const { id } = c.req.valid('param')
  const result = await Contact.deleteOne({ _id: { $eq: id } })
  if (result.deletedCount === 0) throw new HTTPException(404, { message: 'Contact not found!' })
  return c.json({ data: null } satisfies Ok<null>)
}

async function deleteAllContacts(c: Context<Env>) {
  await Contact.deleteMany({ user: { $eq: c.get('user').id } })
  return c.json({ data: null } satisfies Ok<null>)
}

export const getAll = factory.createHandlers(auth, getContacts)
export const lookup = factory.createHandlers(auth, queryParams(contactLookupQuery), lookupContact)
export const create = factory.createHandlers(auth, jsonBody(contactBody), createContact)
export const bulk = factory.createHandlers(auth, jsonBody(contactBulkBody), bulkCreateContacts)
export const update = factory.createHandlers(auth, pathParams(contactIdParam), jsonBody(contactBody), updateContact)
export const remove = factory.createHandlers(auth, pathParams(contactIdParam), deleteContact)
export const removeAll = factory.createHandlers(auth, deleteAllContacts)
