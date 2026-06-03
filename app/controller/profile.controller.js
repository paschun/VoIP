import Validator from 'validatorjs'
import Setting from '../model/setting.model.ts'
import Message from '../model/message.model.ts'
import twilio from 'twilio'
import Telnyx from 'telnyx'
import * as telnyxHelper from '../helper/telnyx.helper.ts'
import * as twilioHelper from '../helper/twilio.helper.ts'

export const crateProfile = async (req, res) => {
    try{
        let rules = {
            profile: 'required'
        };
        const validation = new Validator(req.body, rules);
        if(validation.passes()){
            const checkprofile = {user: { $eq: req.user.id }, profile: { $eq: req.body.profile} };
            const checkProfileData = await Setting.findOne(checkprofile)
            if(checkProfileData){
                res.status(400).json({status:'false',message:'Profile already exists!'});
            }else{
                const storeData = {user: req.user.id , profile: req.body.profile };
                const isSave = await Setting.create(storeData);
                if(isSave){
                    res.send({status:true, message:'Profile saved!', data:isSave});
                }else{
                    res.status(400).json({status:'false',message:'Profile not saved!'});
                }
            }
                
        }else{
            res.status(419).send({status: false, errors:validation.errors, data: []});
        }
    }catch(error){
        res.status(400).json({status:'false',message:'something is wrong'});
    }
};

export const getOneProfile = async (req, res) => {
    try{
        const getData = await Setting.findOne({user: {$eq: req.user.id }, _id:{ $eq: req.body.setting}}).populate({
            path: 'messageCount',
            match: { isview: 'false' } // unread only
        }).populate({
            path: 'totalCount',
            match: { isview: 'false' }
        })
        res.send({status:true, message:'Profile data!', data:getData});
    }catch(error){
        res.status(400).json({status:'false',message:'something is wrong'});
    }
};
export const getProfile = async (req, res) => {
    try{
        const getData = await Setting.find({user:{ $eq: req.user.id}}).populate({
            path: 'messageCount',
            match: { isview: 'false' }
        }).populate({
            path: 'totalCount',
            match: { isview: 'false' }
        })
        res.send({status:true, message:'Profile data!', data:getData});
    }catch(error){
        res.status(400).json({status:'false',message:'something is wrong'});
    }
};
export const deleteProfile = async (req, res) => {
    try{
        var settingCheck = await Setting.findOne({_id:{$eq: req.body.profile_id} })
        if(settingCheck){
            Message.deleteMany({setting:settingCheck._id })
            if(settingCheck.type === 'telnyx' && settingCheck.api_key && settingCheck.setting){
                const telnyxClient = new Telnyx({ apiKey: settingCheck.api_key })
                try{
                    await telnyxClient.phoneNumbers.update(
                        settingCheck.sid,
                        { connection_id: '' }
                    ); 
                }catch(error){
                    
                }
                if(settingCheck.sip_id){
                    try{
                        await telnyxHelper.deleteSIPApp(settingCheck.api_key, settingCheck.sip_id)
                    }catch(error){

                    }

                    try{
                        await telnyxHelper.deleteOutboundVoice(settingCheck.api_key, settingCheck.telnyx_outbound)
                    }catch(error){

                    }
                }
                if(settingCheck.telnyx_twiml){
                    try{
                        await telnyxHelper.deleteTexmlApp(settingCheck.api_key, settingCheck.telnyx_twiml) 
                    }catch(error){
        
                    }
                }
                try{
                    await telnyxClient.phoneNumbers.messaging.update(
                        settingCheck.sid,
                        { messaging_profile_id: "" }
                    ); 
                }catch(error){

                }
                try{
                    await telnyxClient.messagingProfiles.delete(settingCheck.setting);
                }catch(error){

                }
            }
            if(settingCheck.type === 'twilio' && settingCheck.twilio_sid && settingCheck.twilio_token && settingCheck.sid){

                if(settingCheck.app_key){
                    try{
                        await twilioHelper.removeAPIKey(settingCheck.twilio_sid, settingCheck.twilio_token, settingCheck.app_key)
                    }catch(error){

                    }
                }
                if(settingCheck.twiml_app){
                    try{
                        await twilioHelper.deleteTwiml(settingCheck.twilio_sid, settingCheck.twilio_token, settingCheck.twiml_app)
                    } catch(error){

                    }
                }

                const twilioClient = twilio(settingCheck.twilio_sid, settingCheck.twilio_token)
                twilioClient.incomingPhoneNumbers(settingCheck.sid)
                .update({
                    smsUrl: '',
                    voiceUrl: '', 
                    statusCallback: ''
                })
            }
            await Setting.deleteOne({_id:{ $eq: req.body.profile_id } })
            res.send({status:true, message:'Profile deleted successfully!', data:settingCheck});
        }else{
            res.status(400).json({status:'false',message:'Profile not deleted!'});
        }
    }catch(error){
        res.status(400).json({status:'false',message:'something is wrong'});
    }
};

