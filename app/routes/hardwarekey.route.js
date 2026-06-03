import express from 'express'
import * as hardwarekey from '../controller/hardwarekey.controller.js'
import auth from '../middleware/auth.middleware.ts'

export default app => {
    const router = express.Router();
    router.post("/register-key", auth, hardwarekey.registerSession);
    router.post("/register",auth, hardwarekey.register);
    router.post("/verify",auth, hardwarekey.verify);

    router.post("/login-key", hardwarekey.loginSession);
    router.post("/login", hardwarekey.login);

    router.post("/get",auth, hardwarekey.getKey);
    router.post("/delete",auth, hardwarekey.delete);

    app.use('/api/hardwarekey', router);
};
