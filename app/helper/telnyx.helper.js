import Telnyx from 'telnyx'
import moment from 'moment'
import crypto from 'crypto'
import { combineURLs } from './common.helper.js'

//Inside lib file declare functions
const requestCurl = async (method, url, headers, data = null) => {
    try {
        const init = { method, headers };
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
 
const createTexmlApp = (apiKey) => {
    return new Promise(async (resolve,reject) =>  {
        var url = `https://api.telnyx.com/v2/texml_applications`;
        var headers =  { 
            'Content-Type': 'application/json', 
            'Accept': 'application/json', 
            'Authorization': `Bearer ${apiKey}`
          };
        var data = {
          friendly_name: moment().format("YYYYMMDDHHmm"),
          voice_url: combineURLs(process.env.BASE_URL.trim(), "api/call/telnyx"),
          voice_method: "post",
          status_callback: combineURLs(
            process.env.BASE_URL.trim(),
            "api/call/status/telnyx"
          ),
          status_callback_method: "post",
        };
        var response = await requestCurl('POST',url,headers, data);
        resolve(response);
    });
}

const updateTexmlApp = (apiKey, twimlid) => {
    return new Promise(async (resolve,reject) =>  {
        var url = `https://api.telnyx.com/v2/texml_applications/${twimlid}`;
        var headers =  { 
            'Content-Type': 'application/json', 
            'Accept': 'application/json', 
            'Authorization': `Bearer ${apiKey}`
          };
        var data = {
          voice_url: combineURLs(process.env.BASE_URL.trim(), "api/call/telnyx"),
          voice_method: "post",
          status_callback: combineURLs(
            process.env.BASE_URL.trim(),
            "api/call/status/telnyx"
          ),
          status_callback_method: "post",
        };
        var response = await requestCurl('PATCH',url,headers, data);
        resolve(response);
    });
}

const deleteTexmlApp = (apiKey, twimlid) => {
    return new Promise(async (resolve,reject) =>  {
        var url = `https://api.telnyx.com/v2/texml_applications/${twimlid}`;
        var headers =  { 
            'Content-Type': 'application/json', 
            'Accept': 'application/json', 
            'Authorization': `Bearer ${apiKey}`
          };
        var response = await requestCurl('DELETE',url,headers);
        resolve(response);
    });
}

const createSIPApp = (apiKey, userid, outboundProfileid) => {
    // console.log(outboundProfileid)
    return new Promise(async (resolve,reject) =>  {
        try{
            const client = new Telnyx({ apiKey });
            // In Node 10
            var password = crypto.randomBytes(16).toString('hex');
            const credentialConnection =
              await client.credentialConnections.create({
                connection_name: `sip${moment().format("YYYYMMDDHHmm")}`,
                user_name: `user${moment().format("YYYYMMDDHHmm")}`,
                password: password,
                webhook_event_url: combineURLs(
                  process.env.BASE_URL.trim(),
                  "api/call/status/telnyx"
                ),
                outbound: { outbound_voice_profile_id: outboundProfileid },
                sip_uri_calling_preference: "unrestricted",
              });
            resolve(credentialConnection);
        }catch(error){
            console.log(error)
            resolve(false);
        }
    });
}

const updateSIPApp = (apiKey, uuid, outboundProfileid) => {
    return new Promise(async (resolve,reject) =>  {
        try{
            const client = new Telnyx({ apiKey });
            await client.credentialConnections.update(uuid, {
              webhook_event_url: combineURLs(
                process.env.BASE_URL.trim(),
                "api/call/status/telnyx"
              ),
              outbound: { outbound_voice_profile_id: outboundProfileid },
              sip_uri_calling_preference: "unrestricted",
            });
            resolve(true);
        }catch(error){
            // console.log(error)
            resolve(false);
        }
    });
}

const deleteSIPApp = (apiKey, uuid) => {
    return new Promise(async (resolve,reject) =>  {
        try{
            const client = new Telnyx({ apiKey });
            await client.credentialConnections.delete(uuid);
            resolve(true);
        }catch(error){
            // console.log(error)
            resolve(false);
        }
    });
}

const createOutboundVoice = (apiKey) => {
    return new Promise(async (resolve,reject) =>  {
        try{
            const client = new Telnyx({ apiKey });
            // In Node 10
            const outboundVoiceProfiles = await client.outboundVoiceProfiles.create(
                {"name": `outbound${moment().format('YYYYMMDDHHmm')}`}
              );
              // console.log(outboundVoiceProfiles.data)
            resolve(outboundVoiceProfiles);
        }catch(error){
            // console.log(error)
            resolve(false);
        }
    });
}

const deleteOutboundVoice = (apiKey, profileid) => {
    return new Promise(async (resolve,reject) =>  {
        try{
            const client = new Telnyx({ apiKey });
            await client.outboundVoiceProfiles.delete(profileid);
            resolve(true);
        }catch(error){
            // console.log(error)
            resolve(false);
        }
    });
}

const updatePhoneNumber = (apiKey, numbersid) => {
    return new Promise(async (resolve,reject) =>  {
        try{
            const client = new Telnyx({ apiKey });
            await client.phoneNumbers.update(
                numbersid,
                { connection_id: '' }
              ); 
            resolve(true);
        }catch(error){
            resolve(false);
        }
    });
}

const emptyMessageProfile = (apiKey, numbersid) => {
    return new Promise(async (resolve,reject) =>  {
        try{
            const client = new Telnyx({ apiKey });
            await client.phoneNumbers.messaging.update(
                numbersid,
                { messaging_profile_id: "" }
            ); 
            resolve(true);
        }catch(error){
            resolve(false);
        }
    });
}

const deleteMessageProfile = (apiKey, numbersid) => {
    return new Promise(async (resolve,reject) =>  {
        try{
            const client = new Telnyx({ apiKey });
            await client.messagingProfiles.delete(numbersid);
            resolve(true);
        }catch(error){
            resolve(false);
        }
    });
}

const messageProfileFallback = async (data) => {
    return new Promise(async (resolve,reject) =>  {
        try{
            const client = new Telnyx({ apiKey: data.apiKey });
            await client.messagingProfiles.update(data.setting, 
                {
                    "webhook_failover_url": data.url
                }
            );
            resolve(true);
        }catch(error){
            resolve(false);
        }
    });
}

const texmlAppFalback = async (data2) => {
    return new Promise(async (resolve,reject) =>  {
        var url = `https://api.telnyx.com/v2/texml_applications/${data2.twimlid}`;
        var headers =  { 
            'Content-Type': 'application/json', 
            'Accept': 'application/json', 
            'Authorization': `Bearer ${data2.apiKey}`
          };
        var data = {
            "voice_fallback_url" : `${data2.url}`,
            "voice_method" : 'post',
        }
        var response = await requestCurl('PATCH',url,headers, data);
        resolve(response);
    });
}

const sIPAppFallback = async (data) => {
    return new Promise(async (resolve,reject) =>  {
        try{
            const client = new Telnyx({ apiKey: data.apiKey });
            await client.credentialConnections.update(data.uuid, { 
                webhook_event_failover_url: `${data.url}`,
            });
            resolve(true);
        }catch(error){
            // console.log(error)
            resolve(false);
        }
    });
}

const messageProfileGet = async (data) => {
    return new Promise(async (resolve,reject) =>  {
        try{
            var url = `https://api.telnyx.com/v2/messaging_profiles/${data.setting}`;
            var headers =  { 
                'Content-Type': 'application/json', 
                'Accept': 'application/json', 
                'Authorization': `Bearer ${data.apiKey}`
              };
            var response = await requestCurl('GET',url,headers);
            resolve(response);
        }catch(error){
            console.log(error)
            resolve(false);
        }
    });
}

const getNumberData = async (data) => {
    return new Promise(async (resolve,reject) =>  {
        try{
            var url = `https://api.telnyx.com/v2/phone_numbers/${data.number_sid}`;
            var headers =  { 
                'Content-Type': 'application/json', 
                'Accept': 'application/json', 
                'Authorization': `Bearer ${data.apiKey}`
              };
            var response = await requestCurl('GET',url,headers);
            resolve(response);
        }catch(error){
            // console.log(error)
            resolve(false);
        }
    });
}

export {
    requestCurl, createTexmlApp, updateTexmlApp, deleteTexmlApp, createSIPApp, updateSIPApp, deleteSIPApp, createOutboundVoice, deleteOutboundVoice, updatePhoneNumber, emptyMessageProfile, deleteMessageProfile, messageProfileFallback, texmlAppFalback, sIPAppFallback, messageProfileGet, getNumberData
}