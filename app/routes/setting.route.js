import express from 'express'
import * as setting from '../controller/setting.controller.js'
import * as fallback from '../controller/fallback.controller.js'
import auth from '../middleware/auth.middleware.js'

export default app => {
    const router = express.Router();
    router.post("/create",auth, setting.create);
    router.post("/get-number", setting.getNumber);
    router.post("/get-setting",auth, setting.getSetting);
    router.post("/receive-sms/:type", setting.receiveSms); 
    router.post("/sms-status/:type", setting.smsStatus); 
    router.post("/delete-key",auth, setting.deleteKey); 
    //sms route
    router.post("/send-sms",auth, setting.sendSms);
    router.post("/sms-number-list",auth, setting.getNumberList);
    router.post("/message-list",auth, setting.messageList);
    router.post("/message-list-delete",auth, setting.messageDelete);

    router.post("/twilio/twiml/fallback",auth, fallback.twilioTwimlFallback);
    router.post("/telnyx/message/fallback",auth, fallback.telnyxMessageFallback);

    router.post("/twilio/twiml/get",auth, fallback.twilioTwimlGet);
    router.post("/telnyx/message/get",auth, fallback.telnyxMessageGet);

    router.post("/check-setting",auth, fallback.checkCallSetting);
    
    app.use('/api/setting', router);
};
