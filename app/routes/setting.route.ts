import express, { type Express } from 'express'
import * as setting from '../controller/setting.controller.ts'
import auth from '../middleware/auth.middleware.ts'

export default (app: Express) => {
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
    app.use('/api/setting', router);
};
