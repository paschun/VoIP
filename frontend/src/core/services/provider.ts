/** Stateless provider API operations (credential-scoped lookups, no store state). */
import type { InferRequestType, InferResponseType } from 'hono/client'
import type { SuccessStatusCode } from 'hono/utils/http-status'
import { client, request } from '@/core/rpc.client.ts'

const providerNumbers = client.api.setting['provider-numbers']
const numberLookup = client.api.provider['number-lookup']

/** The provider-numbers response payload, discriminated by `type`. */
export type ProviderNumbers = InferResponseType<typeof providerNumbers.$post, SuccessStatusCode>['data']

/** List the numbers owned by the given provider credentials. */
export async function getProviderNumbers(json: InferRequestType<typeof providerNumbers.$post>['json']): Promise<ProviderNumbers> {
  const { data } = await request(providerNumbers.$post({ json }))
  return data
}

/** Fetch one number's provider record (typed loosely server-side); used to detect existing call routing. */
export async function lookupNumber(json: InferRequestType<typeof numberLookup.$post>['json']) {
  const { data } = await request(numberLookup.$post({ json }))
  return data
}
