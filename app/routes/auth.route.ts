import express, { type Express } from 'express'
import * as user from '../controller/user.controller.ts'
import auth from '../middleware/auth.middleware.ts'

export default (app: Express) => {
    const router = express.Router();
    router.post("/login", user.login);
    router.post("/register", user.register);
    router.post("/otp-verify", user.otpVerify);
    router.post("/get-signup", user.getSignUpOption);
    router.get("/get-version", user.getVersionOption);
    router.get("/get-update-version", user.getUpdateVersion);
    router.post("/check-directoryname", user.checkDirectoryName);
    

    router.post('/username/update', auth, user.updateUserName);
    router.post('/password/update', auth, user.updatePassword);
    router.post('/password/check', auth, user.checkPassword);
    router.post('/user/get', auth, user.getUser);
    router.post('/mfa/save', auth, user.saveMfa); 
    router.post('/password/verify', auth, user.passwordVerify); 

    app.use('/api/auth', router);
};
