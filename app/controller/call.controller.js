import Validator from 'validatorjs'
import Setting from '../model/setting.model.js'
import Call from '../model/message.model.js'
import Contact from '../model/contact.model.js'
import twilio from 'twilio'
import { getIO } from '../socket.ts'

export const getToken = async (req, res) => {
    try{
        // var setting = await Setting.findById(req.body.setting_id)
        var setting = await Setting.findOne({_id : {$eq: req.body.setting_id}})
       // console.log(setting)
        if(setting){
            if (setting.type === 'twilio') {
                const AccessToken = twilio.jwt.AccessToken;
                const VoiceGrant = AccessToken.VoiceGrant;

                // Used when generating any kind of tokens
                const twilioAccountSid = setting.twilio_sid;
                const twilioApiKey =  setting.app_key;
                const twilioApiSecret = setting.app_secret;
                const outgoingApplicationSid = setting.twiml_app;
                const identity = req.user.id;

                const voiceGrant = new VoiceGrant({
                    outgoingApplicationSid: outgoingApplicationSid,
                    incomingAllow: true, // Optional: add to allow incoming calls
                });
                const token = new AccessToken(
                    twilioAccountSid,
                    twilioApiKey,
                    twilioApiSecret,
                    {identity: identity}
                );
                token.addGrant(voiceGrant);
                var tokenData = token.toJwt()
                res.send({status:true, message:'get token!', data:{token: tokenData, type: setting.type}});
            }else{
                res.send({status:true, message:'get token!', data:{setting: setting, type: setting.type}});
            }
            
        }
    }catch(error){
        console.log(error)
        res.status(500).send({status:true,error:true, errorData:'something wrong in get token!', data:[] });
    }
};

export const makeCall = async (req, res) => {
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const response = new VoiceResponse();
    try {
        // var settingCheck = await Setting.findOne({number:req.body.twilio_number})
        var checkSetting = await Setting.findOne({number : {$eq: req.body.twilio_number}})
        if(checkSetting){
            var dial = response.dial({
                callerId: req.body.twilio_number
            });

            var phoneNumber = req.body.number.trim().replace("+", "")
            var stringLen = phoneNumber.length
            if(stringLen > 10){
                phoneNumber = `+${phoneNumber}`
            }else if(stringLen == 10){
                phoneNumber = `+1${phoneNumber}`
            }
            var updateCall = {
                sid: req.body.CallSid,
                user: checkSetting.user,
                datatype: 'call',
                type: 'send',
                number: phoneNumber,
                telnyx_number: req.body.twilio_number,
                setting: checkSetting._id,
                isview: 'true'
            }
            var contact = await Contact.findOne({user: { $eq: checkSetting.user}, number: {$eq: phoneNumber}});
            if(contact){
                updateCall.contact = contact._id
            }
            await Call.create(updateCall);
            dial.number(phoneNumber);
            res.set('Content-Type', 'text/xml');
            return res.send(response.toString());
        }
    } catch(error) {
        console.log(error)
        res.set('Content-Type', 'text/xml');
        return res.send(response.toString());
    }
    
};

export const status = async (req, res) => {
    
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const response = new VoiceResponse();
    try{
        var call = await Call.findOne({sid: { $eq: req.body.CallSid}})
        if(call){
            call.duration = req.body.CallDuration
            call.status = req.body.CallStatus
            await call.save()
            var settingCheck = await Setting.findOne({number:{$eq: call.twilio_number}})
            if(settingCheck){
                getIO().to(settingCheck.user.toString()).emit('user_message',{message: 'call', number:call.number});
            }
        }
    }catch(error){

    }
    res.set('Content-Type', 'text/xml');
    res.send(response.toString());
};
export const statusTelnyx = async (req, res) => {
    try{
        if(req.body.CallSid === undefined){
            var event = req.body.data
            switch (event.event_type) {
                case 'call.initiated':
                    if(event.payload.direction === 'outgoing'){
                        var settingCheck = await Setting.findOne({number:{ $eq: event.payload.from}})
                        if(settingCheck){
                            var updateCall = {
                                sid: event.payload.call_session_id,
                                user: settingCheck.user,
                                datatype: 'call',
                                type: 'send',
                                number: event.payload.to,
                                telnyx_number: event.payload.from,
                                setting: settingCheck._id,
                                isview: 'true'
                            }
                            var contact = await Contact.findOne({user: { $eq: settingCheck.user}, number: { $eq: event.payload.to}});
                            if(contact){
                                updateCall.contact = contact._id
                            }
                            Call.create(updateCall);
                        }
                    }
                    break;
                case 'call.hangup':
                        var call = await Call.findOne({sid: {$eq: event.payload.call_session_id}})
                        if(call){
                            var difference = (new Date(event.payload.end_time) - new Date(event.payload.start_time)) / 1000;
                            call.duration = Math.ceil(difference)
                            call.status = 'completed'
                            await call.save()
                            var settingCheck = await Setting.findOne({number:{ $eq: call.twilio_number}})
                            if(settingCheck){
                                getIO().to(settingCheck.user.toString()).emit('user_message',{message: 'call', number:call.number});
                            }
                        }
                    break;
            }
        } else {
            var call = await Call.findOne({sid: { $eq: req.body.CallSid}})
            if(call){
                call.duration = req.body.CallDuration
                call.status = req.body.CallStatus
                await call.save()
                var settingCheck = await Setting.findOne({number: { $eq: call.twilio_number}})
                if(settingCheck){
                    getIO().to(settingCheck.user.toString()).emit('user_message',{message: 'call', number:call.number});
                }
            }
        }
    }catch(error){

    }
    var callXml = `<?xml version="1.0" encoding="UTF-8"?>
                    <Response>
                    </Response>`;
    res.set('Content-Type', 'text/xml');
    res.send(callXml);
};

export const incoming = async (req, res) => {
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const response = new VoiceResponse();
    try{
        var settingCheck = await Setting.findOne({number: {$eq: req.body.To}})
        if(settingCheck){
            const dial = response.dial();
            const client = dial.client();
            client.identity(`${settingCheck.user}`);
            var updateCall = {
                sid: req.body.CallSid,
                user: settingCheck.user,
                datatype: 'call',
                type: 'receive',
                number: req.body.From,
                telnyx_number: req.body.To,
                setting: settingCheck._id,
                isview: 'false'
            }
            var contact = await Contact.findOne({user: { $eq: settingCheck.user}, number: {$eq: req.body.From}});
            if(contact){
                updateCall.contact = contact._id
            }
            Call.create(updateCall);
        }
    }catch(error){

    }
    res.set('Content-Type', 'text/xml');
    res.send(response.toString());
};

export const telnyx = async (req, res) => {
    try{
        var settingCheck = await Setting.findOne({number: { $eq: req.body.To}})
        if(settingCheck && settingCheck.sip_username){
            var callXml = `<?xml version="1.0" encoding="UTF-8"?>
                        <Response>
                        <Dial>
                            <Sip>sip:${settingCheck.sip_username}@sip.telnyx.com</Sip>
                        </Dial>
                        </Response>`;
            var updateCall = {
                sid: req.body.CallSid,
                user: settingCheck.user,
                datatype: 'call',
                type: 'receive',
                number: req.body.From,
                telnyx_number: req.body.To,
                setting: settingCheck._id,
                isview: 'false'
            }
            var contact = await Contact.findOne({user: { $eq: settingCheck.user}, number: {$eq: req.body.From}});
            if(contact){
                updateCall.contact = contact._id
            }
            Call.create(updateCall);
        }
    }catch(error){
        var callXml = `<?xml version="1.0" encoding="UTF-8"?>
                        <Response>
                        </Response>`;
    }
    res.set('Content-Type', 'text/xml');
    res.send(callXml);
};