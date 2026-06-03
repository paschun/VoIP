import twilio from 'twilio'
import { combineURLs } from './common.helper.ts'
import { env } from '../../config/env.ts'

const creatTwiml = async (sid: string, token: string) => {
    try {
        const client = twilio(sid, token);
        const twiml = await client.applications.create({
            voiceMethod: "POST",
            voiceUrl: combineURLs(env.BASE_URL, "api/call/make-call"),
            statusCallback: combineURLs(env.BASE_URL, "api/call/status"),
            statusCallbackMethod: "POST",
            friendlyName: "Operationprivacy VoIPSuite",
        });
        return twiml.sid
    }catch (e){
        console.error(e);
        return false;
    }
}

const updateTwiml = async (sid: string, token: string, twimlsid: string) => {
    try {
        const client = twilio(sid, token);
        const twiml = await client.applications(twimlsid).update({
            voiceMethod: "POST",
            voiceUrl: combineURLs(env.BASE_URL, "api/call/make-call"),
            statusCallback: combineURLs(env.BASE_URL, "api/call/status"),
            statusCallbackMethod: "POST",
        });
        return twiml.sid
    }catch (e){
        console.error(e);
        return false;
    }
}

const deleteTwiml = async (sid: string, token: string, twimlsid: string) => {
    try {
        const client = twilio(sid, token);
        await client.applications(twimlsid).remove()
        return true
    }catch (e){
        console.error(e);
        return false;
    }
}

const creatAPIKey = async (sid: string, token: string) => {
    try {
        const client = twilio(sid, token);
        const apiKey = await client.newKeys.create({ friendlyName: 'Operationprivacy call API Key' })
        return apiKey
    }catch (e){
        console.error(e);
        return false;
    }
}

const removeAPIKey = async (sid: string, token: string, api_key: string) => {
    try {
        const client = twilio(sid, token);
        await client.keys(api_key).remove();
        return true
    }catch (e){
        console.error(e);
        return false;
    }
}

const unlinkNumber = async (sid: string, token: string, numbersid: string) => {
    try {
        const client = twilio(sid, token);
        await client.incomingPhoneNumbers(numbersid).update({
            smsUrl: '',
            voiceUrl: '',
            statusCallback: ''
        })
        return true
    }catch (e){
        console.error(e);
        return false;
    }
}

const twimlFallbackUpdate = async (params: { sid: string; token: string; twimlsid: string; url: string }) => {
    try {
        const client = twilio(params.sid, params.token);
        await client.applications(params.twimlsid).update({
            voiceFallbackUrl: params.url,
            voiceFallbackMethod: 'POST'
        })
        return true
    }catch (e){
        console.error(e);
        return false;
    }
}

const numberFallbackUpdate = async (params: { sid: string; token: string; numbersid: string; voice_url: string; sms_url: string }) => {
    try {
        const client = twilio(params.sid, params.token);
        await client.incomingPhoneNumbers(params.numbersid).update({
            voiceFallbackUrl: params.voice_url,
            voiceFallbackMethod: 'POST',
            smsFallbackUrl: params.sms_url,
            smsFallbackMethod: 'POST'
        })
        return true
    }catch (e){
        console.error(e);
        return false;
    }
}

const twimlGet = async (params: { sid: string; token: string; twimlsid: string }) => {
    try {
        const client = twilio(params.sid, params.token);
        const app = await client.applications(params.twimlsid).fetch()
        return app
    }catch (e){
        console.error(e);
        return false;
    }
}

const numberGet = async (params: { sid: string; token: string; numbersid: string }) => {
    try {
        const client = twilio(params.sid, params.token);
        const number = await client.incomingPhoneNumbers(params.numbersid).fetch()
        return number
    }catch (e){
        console.error(e);
        return false;
    }
}

export {
    creatTwiml, updateTwiml, deleteTwiml, creatAPIKey, removeAPIKey, unlinkNumber, twimlFallbackUpdate,
    numberFallbackUpdate, twimlGet, numberGet,
}
