import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import Contact from '../model/contact.model.ts'
import { Message } from '../model/message.model.ts'
import { factory } from '../factory.ts'
import type { Env, JsonCtx, ParamCtx, QueryCtx, ParamJsonCtx } from '../factory.ts'
import { auth } from '../middleware/auth.hono.ts'
import { jsonBody, pathParams, queryParams } from '../validate.ts'
import { normalizeNumber } from '../helper/common.helper.ts'
import type { Ok } from '../../shared/api-contracts.ts'
import {
  contactBody, type ContactRequest,
  contactBulkBody, type ContactBulkRequest,
  contactLookupQuery, type ContactLookupQuery,
  contactIdParam, type ContactIdParam,
} from '../../shared/contracts/contact.ts'
import { ack, created } from '../util/respond.hono.ts'

const MAX_CONTACTS = 500

async function getContacts(c: Context<Env>) {
  // collation locale 'en' makes the first_name sort case-insensitive and locale-aware (so 'bob' and 'Bob' order together)
  // without it Mongo sorts by raw bytes (all uppercase before lowercase).
  // sort `1` == ascending
  const contacts = await Contact.find({ user: { $eq: c.get('user').id } }).collation({ locale: 'en' }).sort({ first_name: 1 })
  const data = contacts.map((d) => d.toObject({ flattenObjectIds: true }))
  return c.json({ data } satisfies Ok, 200)
}

async function lookupContact(c: QueryCtx<ContactLookupQuery>) {
  const number = normalizeNumber(c.req.valid('query').number)
  const contact = await Contact.findOne({ user: { $eq: c.get('user').id }, number: { $eq: number } })
  // note: only first_name and last_name are used by client
  const data = contact ? contact.toObject({ flattenObjectIds: true }) : null
  return c.json({ data } satisfies Ok, 200)
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
  return created(c)
}

async function bulkCreateContacts(c: JsonCtx<ContactBulkRequest>) {
  const user = c.get('user').id
  // track `count` to see if we go over max
  let count = await Contact.countDocuments({ user: { $eq: user } })
  for (const item of c.req.valid('json').contacts) {
    if (count >= MAX_CONTACTS) break
    const number = normalizeNumber(item.number)
    const exists = await Contact.findOne({ user: { $eq: user }, number: { $eq: number } })
    if (exists) continue
    await Contact.create({ user, number, first_name: item.first_name ?? '', last_name: item.last_name ?? '', note: item.note ?? '' })
    count++
  }
  return created(c)
}

async function updateContact(c: ParamJsonCtx<ContactIdParam, ContactRequest>) {
  const { id } = c.req.valid('param')
  const body = c.req.valid('json')
  // Scope by user so a user can't update another's contact by guessing its id (IDOR); a non-owned id 404s.
  const contact = await Contact.findOne({ _id: { $eq: id }, user: { $eq: c.get('user').id } })
  if (!contact) throw new HTTPException(404, { message: 'Contact not found!' })
  contact.first_name = body.first_name
  contact.last_name = body.last_name ?? ''
  contact.number = normalizeNumber(body.number)
  contact.note = body.note ?? ''
  await contact.save()
  return ack(c)
}

async function deleteContact(c: ParamCtx<ContactIdParam>) {
  const { id } = c.req.valid('param')
  // Scope by user so a user can only delete their own contacts.
  const result = await Contact.deleteOne({ _id: { $eq: id }, user: { $eq: c.get('user').id } })
  if (result.deletedCount === 0) throw new HTTPException(404, { message: 'Contact not found!' })
  return ack(c)
}

async function deleteAllContacts(c: Context<Env>) {
  await Contact.deleteMany({ user: { $eq: c.get('user').id } })
  return ack(c)
}

export const getAll = factory.createHandlers(auth, getContacts)
export const lookup = factory.createHandlers(auth, queryParams(contactLookupQuery), lookupContact)
export const create = factory.createHandlers(auth, jsonBody(contactBody), createContact)
export const bulk = factory.createHandlers(auth, jsonBody(contactBulkBody), bulkCreateContacts)
export const update = factory.createHandlers(auth, pathParams(contactIdParam), jsonBody(contactBody), updateContact)
export const remove = factory.createHandlers(auth, pathParams(contactIdParam), deleteContact)
export const removeAll = factory.createHandlers(auth, deleteAllContacts)
