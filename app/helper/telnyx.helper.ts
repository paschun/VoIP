import Telnyx from 'telnyx'
import moment from 'moment'
import crypto from 'crypto'
import { combineURLs } from './common.helper.ts'
import { WEBHOOK_PATHS } from './webhook-paths.ts'
import { env } from '../../config/env.ts'

// moment format used to build unique, human-readable resource names (down to the minute).
const timestampFormat = 'YYYYMMDDHHmm'

//Inside lib file declare functions
const requestCurl = async (method: string, url: string, headers: Record<string, string>, data?: unknown) => {
    try {
        const init: RequestInit = { method, headers };
        if (data) init.body = JSON.stringify(data);
        const response = await fetch(url, init);
        if (!response.ok) return false;
        const text = await response.text();
        return text ? JSON.parse(text) : null;
    } catch (error) {
        // console.error(error)
        return false;
    }
}

const createTexmlApp = async (apiKey: string) => {
    const url = `https://api.telnyx.com/v2/texml_applications`;
    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiKey}`
    };
    const data = {
        friendly_name: moment().format(timestampFormat),
        voice_url: combineURLs(env.BASE_URL, WEBHOOK_PATHS.telnyxVoice),
        voice_method: "post",
        status_callback: combineURLs(env.BASE_URL, WEBHOOK_PATHS.telnyxStatus),
        status_callback_method: "post",
    };
    return requestCurl('POST', url, headers, data);
}

const updateTexmlApp = async (apiKey: string, twimlid: string) => {
    const url = `https://api.telnyx.com/v2/texml_applications/${twimlid}`;
    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiKey}`
    };
    const data = {
        voice_url: combineURLs(env.BASE_URL, WEBHOOK_PATHS.telnyxVoice),
        voice_method: "post",
        status_callback: combineURLs(env.BASE_URL, WEBHOOK_PATHS.telnyxStatus),
        status_callback_method: "post",
    };
    return requestCurl('PATCH', url, headers, data);
}

const deleteTexmlApp = async (apiKey: string, twimlid: string) => {
    const url = `https://api.telnyx.com/v2/texml_applications/${twimlid}`;
    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiKey}`
    };
    return requestCurl('DELETE', url, headers);
}

const createSIPApp = async (apiKey: string, userid: string, outboundProfileid: string) => {
    try {
        const client = new Telnyx({ apiKey });
        const password = crypto.randomBytes(16).toString('hex');
        const credentialConnection = await client.credentialConnections.create({
            connection_name: `sip${moment().format(timestampFormat)}`,
            user_name: `user${moment().format(timestampFormat)}`,
            password: password,
            webhook_event_url: combineURLs(env.BASE_URL, WEBHOOK_PATHS.telnyxStatus),
            outbound: { outbound_voice_profile_id: outboundProfileid },
            sip_uri_calling_preference: "unrestricted",
        });
        return credentialConnection;
    } catch (error) {
        console.error(error)
        return false;
    }
}

const updateSIPApp = async (apiKey: string, uuid: string, outboundProfileid: string) => {
    try {
        const client = new Telnyx({ apiKey });
        await client.credentialConnections.update(uuid, {
            webhook_event_url: combineURLs(env.BASE_URL, WEBHOOK_PATHS.telnyxStatus),
            outbound: { outbound_voice_profile_id: outboundProfileid },
            sip_uri_calling_preference: "unrestricted",
        });
        return true;
    } catch (error) {
        // console.error(error)
        return false;
    }
}

const deleteSIPApp = async (apiKey: string, uuid: string) => {
    try {
        const client = new Telnyx({ apiKey });
        await client.credentialConnections.delete(uuid);
        return true;
    } catch (error) {
        // console.error(error)
        return false;
    }
}

const createOutboundVoice = async (apiKey: string) => {
    try {
        const client = new Telnyx({ apiKey });
        const outboundVoiceProfiles = await client.outboundVoiceProfiles.create(
            { "name": `outbound${moment().format(timestampFormat)}` }
        );
        // console.log(outboundVoiceProfiles.data)
        return outboundVoiceProfiles;
    } catch (error) {
        // console.error(error)
        return false;
    }
}

const deleteOutboundVoice = async (apiKey: string, profileid: string) => {
    try {
        const client = new Telnyx({ apiKey });
        await client.outboundVoiceProfiles.delete(profileid);
        return true;
    } catch (error) {
        // console.error(error)
        return false;
    }
}

const updatePhoneNumber = async (apiKey: string, numbersid: string) => {
    try {
        const client = new Telnyx({ apiKey });
        await client.phoneNumbers.update(numbersid, { connection_id: '' });
        return true;
    } catch (error) {
        return false;
    }
}

const emptyMessageProfile = async (apiKey: string, numbersid: string) => {
    try {
        const client = new Telnyx({ apiKey });
        await client.phoneNumbers.messaging.update(numbersid, { messaging_profile_id: "" });
        return true;
    } catch (error) {
        return false;
    }
}

const deleteMessageProfile = async (apiKey: string, numbersid: string) => {
    try {
        const client = new Telnyx({ apiKey });
        await client.messagingProfiles.delete(numbersid);
        return true;
    } catch (error) {
        return false;
    }
}

const messageProfileFallback = async (params: { apiKey: string; setting: string; url: string }) => {
    try {
        const client = new Telnyx({ apiKey: params.apiKey });
        await client.messagingProfiles.update(params.setting, { "webhook_failover_url": params.url });
        return true;
    } catch (error) {
        return false;
    }
}

const texmlAppFallback = async (params: { twimlid: string; apiKey: string; url: string }) => {
    const url = `https://api.telnyx.com/v2/texml_applications/${params.twimlid}`;
    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${params.apiKey}`
    };
    const data = {
        "voice_fallback_url": `${params.url}`,
        "voice_method": 'post',
    }
    return requestCurl('PATCH', url, headers, data);
}

const sipAppFallback = async (params: { apiKey: string; uuid: string; url: string }) => {
    try {
        const client = new Telnyx({ apiKey: params.apiKey });
        await client.credentialConnections.update(params.uuid, {
            webhook_event_failover_url: `${params.url}`,
        });
        return true;
    } catch (error) {
        // console.error(error)
        return false;
    }
}

const messageProfileGet = async (params: { setting: string; apiKey: string }) => {
    try {
        const url = `https://api.telnyx.com/v2/messaging_profiles/${params.setting}`;
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${params.apiKey}`
        };
        return await requestCurl('GET', url, headers);
    } catch (error) {
        console.error(error)
        return false;
    }
}

const getNumberData = async (params: { number_sid: string; apiKey: string }) => {
    try {
        const url = `https://api.telnyx.com/v2/phone_numbers/${params.number_sid}`;
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${params.apiKey}`
        };
        return await requestCurl('GET', url, headers);
    } catch (error) {
        // console.error(error)
        return false;
    }
}

export {
    createTexmlApp, updateTexmlApp, deleteTexmlApp, createSIPApp, updateSIPApp, deleteSIPApp,
    createOutboundVoice, deleteOutboundVoice, updatePhoneNumber, emptyMessageProfile, deleteMessageProfile,
    messageProfileFallback, texmlAppFallback, sipAppFallback, messageProfileGet, getNumberData,
}
