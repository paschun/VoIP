import express from 'express'
import * as email from '../controller/email.controller.js'
import auth from '../middleware/auth.middleware.js'

export default app => {
    const router = express.Router();

    router.post("/create", auth, email.create);
    router.get("/setting-get", auth, email.getEmail);
    router.post("/save/setting", auth, email.saveSetting);
    
    app.use('/api/email', router);
};
