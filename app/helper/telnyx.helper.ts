import Telnyx from 'telnyx'
import moment from 'moment'
import crypto from 'crypto'
import { combineURLs } from './common.helper.ts'
import { WEBHOOKS } from './webhook-paths.ts'
import { env } from '../../config/env.ts'
import { ProviderError } from '../provider-error.ts'
import type { HttpMethod } from '../../shared/api-contracts.ts'

/**
 * Telnyx provisioning/teardown helpers. Error policy is split by intent, and the functions below are grouped into the
 * two matching sections:
 *
 * - SETUP / GET / FALLBACK helpers (`create*`/`update*`, `*Get`, `*Fallback`) THROW `ProviderError`. They run while
 *   serving a live user request, so a provider failure should surface (onError renders it as a 502) rather than be
 *   silently dropped.
 * - TEARDOWN helpers (`delete*`/`empty*`/`updatePhoneNumber`) SWALLOW the error, log it, and return `false`. They run
 *   during account/profile/setting deletion, where each call is independent best-effort cleanup; throwing would abort
 *   the remaining cleanup and block a legitimate delete. Callers wrap them in a try/catch that ignores the result.
 */

// moment format used to build unique, human-readable resource names (down to the minute).
const timestampFormat = 'YYYYMMDDHHmm'

/** Standard Telnyx REST headers: JSON content/accept plus bearer auth. */
const telnyxHeaders = (apiKey: string) => ({
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
})

/**
 * Thin Telnyx REST caller for endpoints the SDK doesn't cover.
 *
 * @param op calling helper's name, used only to label the server-side error log
 * @param method HTTP verb
 * @param url full Telnyx API URL
 * @param headers request headers (see {@link telnyxHeaders})
 * @param data optional JSON request body
 * @returns the parsed JSON response, or `null` for an empty body
 * @throws ProviderError on a transport failure or non-2xx response, so onError can surface a 502
 */
const requestCurl = async (op: string, method: HttpMethod, url: string, headers: Record<string, string>, data?: unknown) => {
    let response: Response;
    try {
        const init: RequestInit = { method, headers };
        if (data) init.body = JSON.stringify(data);
        response = await fetch(url, init);
    } catch (error) {
        throw new ProviderError('telnyx', op, { cause: error });
    }
    if (!response.ok) throw new ProviderError('telnyx', op, { status: response.status });
    const text = await response.text();
    return text ? JSON.parse(text) : null;
}

// === Setup / GET / fallback helpers: THROW ProviderError on failure (onError renders 502). See file header. ===

const createTexmlApp = async (apiKey: string) => {
    const url = `https://api.telnyx.com/v2/texml_applications`;
    const data = {
        friendly_name: moment().format(timestampFormat),
        voice_url: combineURLs(env.BASE_URL, WEBHOOKS.call.telnyxVoice.full),
        voice_method: "post",
        status_callback: combineURLs(env.BASE_URL, WEBHOOKS.call.telnyxStatus.full),
        status_callback_method: "post",
    };
    return requestCurl('createTexmlApp', 'POST', url, telnyxHeaders(apiKey), data);
}

const updateTexmlApp = async (apiKey: string, twimlid: string) => {
    const url = `https://api.telnyx.com/v2/texml_applications/${twimlid}`;
    const data = {
        voice_url: combineURLs(env.BASE_URL, WEBHOOKS.call.telnyxVoice.full),
        voice_method: "post",
        status_callback: combineURLs(env.BASE_URL, WEBHOOKS.call.telnyxStatus.full),
        status_callback_method: "post",
    };
    return requestCurl('updateTexmlApp', 'PATCH', url, telnyxHeaders(apiKey), data);
}

const createSIPApp = async (apiKey: string, userid: string, outboundProfileid: string) => {
    try {
        const client = new Telnyx({ apiKey });
        const password = crypto.randomBytes(16).toString('hex');
        const credentialConnection = await client.credentialConnections.create({
            connection_name: `sip${moment().format(timestampFormat)}`,
            user_name: `user${moment().format(timestampFormat)}`,
            password,
            webhook_event_url: combineURLs(env.BASE_URL, WEBHOOKS.call.telnyxStatus.full),
            outbound: { outbound_voice_profile_id: outboundProfileid },
            sip_uri_calling_preference: "unrestricted",
        });
        return credentialConnection;
    } catch (error) {
        throw new ProviderError('telnyx', 'createSIPApp', { cause: error });
    }
}

const updateSIPApp = async (apiKey: string, uuid: string, outboundProfileid: string) => {
    try {
        const client = new Telnyx({ apiKey });
        await client.credentialConnections.update(uuid, {
            webhook_event_url: combineURLs(env.BASE_URL, WEBHOOKS.call.telnyxStatus.full),
            outbound: { outbound_voice_profile_id: outboundProfileid },
            sip_uri_calling_preference: "unrestricted",
        });
        return true;
    } catch (error) {
        throw new ProviderError('telnyx', 'updateSIPApp', { cause: error });
    }
}

const createOutboundVoice = async (apiKey: string) => {
    try {
        const client = new Telnyx({ apiKey });
        const outboundVoiceProfiles = await client.outboundVoiceProfiles.create(
            { "name": `outbound${moment().format(timestampFormat)}` }
        );
        return outboundVoiceProfiles;
    } catch (error) {
        throw new ProviderError('telnyx', 'createOutboundVoice', { cause: error });
    }
}

const messageProfileFallback = async (params: { apiKey: string; setting: string; url: string }) => {
    try {
        const client = new Telnyx({ apiKey: params.apiKey });
        await client.messagingProfiles.update(params.setting, { "webhook_failover_url": params.url });
        return true;
    } catch (error) {
        throw new ProviderError('telnyx', 'messageProfileFallback', { cause: error });
    }
}

const texmlAppFallback = async (params: { twimlid: string; apiKey: string; url: string }) => {
    const url = `https://api.telnyx.com/v2/texml_applications/${params.twimlid}`;
    const data = {
        "voice_fallback_url": `${params.url}`,
        "voice_method": 'post',
    }
    return requestCurl('texmlAppFallback', 'PATCH', url, telnyxHeaders(params.apiKey), data);
}

const sipAppFallback = async (params: { apiKey: string; uuid: string; url: string }) => {
    try {
        const client = new Telnyx({ apiKey: params.apiKey });
        await client.credentialConnections.update(params.uuid, {
            webhook_event_failover_url: `${params.url}`,
        });
        return true;
    } catch (error) {
        throw new ProviderError('telnyx', 'sipAppFallback', { cause: error });
    }
}

const messageProfileGet = (params: { setting: string; apiKey: string }) =>
    requestCurl('messageProfileGet', 'GET', `https://api.telnyx.com/v2/messaging_profiles/${params.setting}`, telnyxHeaders(params.apiKey));

const getNumberData = (params: { number_sid: string; apiKey: string }) =>
    requestCurl('getNumberData', 'GET', `https://api.telnyx.com/v2/phone_numbers/${params.number_sid}`, telnyxHeaders(params.apiKey));

// === Teardown helpers: SWALLOW + log, return false. Best-effort cleanup during deletion. See file header. ===

const deleteTexmlApp = async (apiKey: string, twimlid: string) => {
    const url = `https://api.telnyx.com/v2/texml_applications/${twimlid}`;
    try {
        return await requestCurl('deleteTexmlApp', 'DELETE', url, telnyxHeaders(apiKey));
    } catch (error) {
        console.error('deleteTexmlApp teardown failed', error);
        return false;
    }
}

const deleteSIPApp = async (apiKey: string, uuid: string) => {
    try {
        const client = new Telnyx({ apiKey });
        await client.credentialConnections.delete(uuid);
        return true;
    } catch (error) {
        console.error('deleteSIPApp teardown failed', error);
        return false;
    }
}

const deleteOutboundVoice = async (apiKey: string, profileid: string) => {
    try {
        const client = new Telnyx({ apiKey });
        await client.outboundVoiceProfiles.delete(profileid);
        return true;
    } catch (error) {
        console.error('deleteOutboundVoice teardown failed', error);
        return false;
    }
}

const updatePhoneNumber = async (apiKey: string, numbersid: string) => {
    try {
        const client = new Telnyx({ apiKey });
        await client.phoneNumbers.update(numbersid, { connection_id: '' });
        return true;
    } catch (error) {
        console.error('updatePhoneNumber teardown failed', error);
        return false;
    }
}

const emptyMessageProfile = async (apiKey: string, numbersid: string) => {
    try {
        const client = new Telnyx({ apiKey });
        await client.phoneNumbers.messaging.update(numbersid, { messaging_profile_id: "" });
        return true;
    } catch (error) {
        console.error('emptyMessageProfile teardown failed', error);
        return false;
    }
}

const deleteMessageProfile = async (apiKey: string, numbersid: string) => {
    try {
        const client = new Telnyx({ apiKey });
        await client.messagingProfiles.delete(numbersid);
        return true;
    } catch (error) {
        console.error('deleteMessageProfile teardown failed', error);
        return false;
    }
}

export {
    createTexmlApp, updateTexmlApp, createSIPApp, updateSIPApp, createOutboundVoice,
    messageProfileFallback, texmlAppFallback, sipAppFallback, messageProfileGet, getNumberData,
    deleteTexmlApp, deleteSIPApp, deleteOutboundVoice, updatePhoneNumber, emptyMessageProfile, deleteMessageProfile,
}
